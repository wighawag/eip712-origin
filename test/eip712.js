const ethUtil = require('ethereumjs-util');
const abi = require('ethereumjs-abi');

// Recursively finds all the dependencies of a type
function dependencies(types, primaryType, found = []) {
    if (found.includes(primaryType)) {
        return found;
    }
    if (types[primaryType] === undefined) {
        return found;
    }
    found.push(primaryType);
    for (let field of types[primaryType]) {
        for (let dep of dependencies(types, field.type, found)) {
            if (!found.includes(dep)) {
                found.push(dep);
            }
        }
    }
    return found;
}

function encodeType(types, primaryType) {
    // Get dependencies primary first, then alphabetical
    let deps = dependencies(types, primaryType);
    deps = deps.filter(t => t != primaryType);
    deps = [primaryType].concat(deps.sort());

    // Format as a string with fields
    let result = '';
    for (let type of deps) {
        result += `${type}(${types[type].map(({ name, type }) => `${type} ${name}`).join(',')})`;
    }
    return result;
}

function typeHash(types, primaryType) {
    return ethUtil.sha3(encodeType(types, primaryType));
}


class EIP712{
    constructor(types, primaryType, domainType) {
      this.primaryType = primaryType;
      this.types = types; 
      this.domainType = domainType;
    }

    encodeData(type, data) {
        const types = this.types;

        let encTypes = [];
        let encValues = [];    
    
        // Add typehash
        encTypes.push('bytes32');
        encValues.push(typeHash(types, type)); // TODO cache
    
        // Add field contents
        for (let field of types[type]) {
            let value = data[field.name];
            if (field.type == 'string' || field.type == 'bytes') {
                encTypes.push('bytes32');
                value = ethUtil.sha3(value);
                encValues.push(value);
            } else if (types[field.type] !== undefined) {
                encTypes.push('bytes32');
                value = ethUtil.sha3(this.encodeData(field.type, value));
                encValues.push(value);
            } else if (field.type.lastIndexOf(']') === field.type.length - 1) {
                throw 'TODO: Arrays currently unimplemented in encodeData';
            } else {
                encTypes.push(field.type);
                encValues.push(value);
            }
        }
    
        return abi.rawEncode(encTypes, encValues);
    }

    structHash(type, data) {
        return ethUtil.sha3(this.encodeData(type, data));
    }

    hash(domain, message, originHash, interactive) {
        const data = [
            Buffer.from('1901', 'hex'),
            this.structHash(this.domainType, domain),
            this.structHash(this.primaryType, message)
        ];
        if(originHash) {
            data.push(Buffer.from(originHash.slice(2), 'hex'));
            data.push(Buffer.from(interactive ? '01' : '00', 'hex'));
        }
        const buffer = Buffer.concat(data);
        return ethUtil.sha3(buffer);
    }
    
    generateSignature(privateKey, domain, message, originHash, interactive) {
        const hash = this.hash(domain, message, originHash, interactive);
        const sig = ethUtil.ecsign(hash, privateKey);
        return {
            v: sig.v,
            r: '0x' + sig.r.toString('hex'),
            s: '0x' + sig.s.toString('hex')
        }
    }
}

module.exports = {
    EIP712
}
