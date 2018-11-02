pragma solidity ^0.4.24;

contract Example {
    
    struct EIP712Domain {
        string  name;
        string  version;
        uint256 chainId;
        address verifyingContract;
    }

    struct Person {
        string name;
        address wallet;
    }

    struct Mail {
        Person from;
        Person to;
        string contents;
    }

    bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 constant PERSON_TYPEHASH = keccak256(
        "Person(string name,address wallet)"
    );

    bytes32 constant MAIL_TYPEHASH = keccak256(
        "Mail(Person from,Person to,string contents)Person(string name,address wallet)"
    );

    bytes32 DOMAIN_SEPARATOR;

    constructor () public {
        DOMAIN_SEPARATOR = hash(EIP712Domain({
            name: "Ether Mail",
            version: '1',
            chainId: 1,
            // verifyingContract: this
            verifyingContract: 0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC
        }));
    }

    function hash(EIP712Domain eip712Domain) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            EIP712DOMAIN_TYPEHASH,
            keccak256(bytes(eip712Domain.name)),
            keccak256(bytes(eip712Domain.version)),
            eip712Domain.chainId,
            eip712Domain.verifyingContract
        ));
    }

    function hash(Person person) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            PERSON_TYPEHASH,
            keccak256(bytes(person.name)),
            person.wallet
        ));
    }

    function hash(Mail mail) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            MAIL_TYPEHASH,
            hash(mail.from),
            hash(mail.to),
            keccak256(bytes(mail.contents))
        ));
    }

    function verify(Mail mail, uint8 v, bytes32 r, bytes32 s) internal view returns (bool) {
        // Note: we need to use `encodePacked` here instead of `encode`.
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            hash(mail)
        ));
        return ecrecover(digest, v, r, s) == mail.from.wallet;
    }
    
    function test(string _fromName, address _fromWallet, string _toName, address _toWallet, string _content, uint8 v, bytes32 r, bytes32 s) public view returns (bool) {
        // Example signed message
        Mail memory mail = Mail({
            from: Person({
               name: _fromName,
               wallet: _fromWallet
            }),
            to: Person({
                name: _toName,
                wallet: _toWallet
            }),
            contents: _content
        });
        assert(verify(mail, v, r, s));
        return true;
    }

    function test() public view returns (bool) {
        // Example signed message
        Mail memory mail = Mail({
            from: Person({
               name: "Cow",
               wallet: 0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826
            }),
            to: Person({
                name: "Bob",
                wallet: 0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB
            }),
            contents: "Hello, Bob!"
        });
        uint8 v = 28;
        bytes32 r = 0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d;
        bytes32 s = 0x07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b91562;
        
        assert(DOMAIN_SEPARATOR == 0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f);
        assert(hash(mail) == 0xc52c0ee5d84264471806290a3f2c4cecfc5490626bf912d01f240d7a274b371e);
        assert(verify(mail, v, r, s));
        return true;
    }


    ////////////////////////////// using origin //////
    mapping(address => mapping(bytes32 => bool)) approvedOrigins;
    function approveOrigin(bytes32 _originHash) external {
        approvedOrigins[msg.sender][_originHash & 2^256-1] = true; // should not be needed if browser supply a 255bit hash
    }

    struct MailWithOrigin {
        bytes32 _originHash;  // TODO _contentHash too ?
        Person from;
        Person to;
        string contents;
    }

    bytes32 constant MAIL_WITH_ORIGIN_TYPEHASH = keccak256(
        "MailWithOrigin(bytes32 _originHash,Person from,Person to,string contents)Person(string name,address wallet)"
    );

    function hash(MailWithOrigin mail) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            MAIL_WITH_ORIGIN_TYPEHASH,
            mail._originHash, 
            hash(mail.from),
            hash(mail.to),
            keccak256(bytes(mail.contents))
        ));
    }

    function verifyOnlySignaturesWithUserConfirmation(MailWithOrigin mail, uint8 v, bytes32 r, bytes32 s) internal view returns (bool) {
        require(approvedOrigins[mail.from.wallet][mail._originHash & 2^256-1], "origin not approved by mail sender");
        require(uint256(mail._originHash) % 2 == 1); // bit need to be set to interactive
        //require(mail.userConfirmation, "signature was not confirmed by user");
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            hash(mail)
        ));
        return ecrecover(digest, v, r, s) == mail.from.wallet;
    }

     function verify(MailWithOrigin mail, uint8 v, bytes32 r, bytes32 s) internal view returns (bool) {
        require(approvedOrigins[mail.from.wallet][mail._originHash & 2^256-1], "origin not approved by mail sender");
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            hash(mail)
        ));
        return ecrecover(digest, v, r, s) == mail.from.wallet;
    }

    function test(bytes32 _originHash, string _fromName, address _fromWallet, string _toName, address _toWallet, string _content, uint8 v, bytes32 r, bytes32 s) public view returns (bool) {
        // Example signed message
        MailWithOrigin memory mail = MailWithOrigin({
            _originHash: _originHash,
            from: Person({
               name: _fromName,
               wallet: _fromWallet
            }),
            to: Person({
                name: _toName,
                wallet: _toWallet
            }),
            contents: _content
        });
        assert(verifyOnlySignaturesWithUserConfirmation(mail, v, r, s));
        return true;
    }


    function testNonInteractive(bytes32 _originHash, string _fromName, address _fromWallet, string _toName, address _toWallet, string _content, uint8 v, bytes32 r, bytes32 s) public view returns (bool) {
        // Example signed message
        MailWithOrigin memory mail = MailWithOrigin({
            _originHash: _originHash,
            from: Person({
               name: _fromName,
               wallet: _fromWallet
            }),
            to: Person({
                name: _toName,
                wallet: _toWallet
            }),
            contents: _content
        });
        assert(verify(mail, v, r, s));
        return true;
    }

}
