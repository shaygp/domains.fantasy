// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DomainRegistry is ERC721, Ownable, ReentrancyGuard {
    struct Domain {
        string name;
        uint256 expiryDate;
        bool isActive;
        uint256 renewalPrice;
        address registrar;
        uint256 registrationDate;
        mapping(string => string) metadata;
    }

    mapping(uint256 => Domain) public domains;
    mapping(string => uint256) public domainNameToId;
    mapping(string => bool) public reservedNames;
    
    uint256 private _tokenIdCounter;
    uint256 public registrationFee = 0.01 ether;
    uint256 public renewalFee = 0.005 ether;
    address public auctionContract;

    event DomainRegistered(uint256 indexed tokenId, string name, address indexed owner, uint256 expiryDate);
    event DomainRenewed(uint256 indexed tokenId, uint256 newExpiryDate);
    event DomainTransferred(uint256 indexed tokenId, address indexed from, address indexed to);
    event MetadataUpdated(uint256 indexed tokenId, string key, string value);

    constructor() ERC721("Fantasy Domains", "FDOM") {}

    function registerDomain(string memory _name, uint256 _duration) external payable nonReentrant returns (uint256) {
        require(_duration >= 365 days && _duration <= 3650 days, "Invalid duration");
        require(bytes(_name).length >= 3 && bytes(_name).length <= 63, "Invalid domain length");
        require(domainNameToId[_name] == 0 || !domains[domainNameToId[_name]].isActive, "Domain already registered");
        require(!reservedNames[_name], "Domain name is reserved");
        require(msg.value >= registrationFee, "Insufficient registration fee");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        uint256 expiryDate = block.timestamp + _duration;

        _safeMint(msg.sender, tokenId);
        
        Domain storage domain = domains[tokenId];
        domain.name = _name;
        domain.expiryDate = expiryDate;
        domain.isActive = true;
        domain.renewalPrice = renewalFee;
        domain.registrar = msg.sender;
        domain.registrationDate = block.timestamp;

        domainNameToId[_name] = tokenId;

        emit DomainRegistered(tokenId, _name, msg.sender, expiryDate);
        return tokenId;
    }

    function renewDomain(uint256 _tokenId, uint256 _duration) external payable nonReentrant {
        require(_exists(_tokenId), "Domain does not exist");
        require(ownerOf(_tokenId) == msg.sender, "Not domain owner");
        require(_duration >= 365 days && _duration <= 3650 days, "Invalid duration");
        require(msg.value >= renewalFee, "Insufficient renewal fee");

        Domain storage domain = domains[_tokenId];
        uint256 currentExpiry = domain.isActive && domain.expiryDate > block.timestamp 
            ? domain.expiryDate 
            : block.timestamp;
            
        domain.expiryDate = currentExpiry + _duration;
        domain.isActive = true;

        emit DomainRenewed(_tokenId, domain.expiryDate);
    }

    function transferDomain(address _to, uint256 _tokenId) external {
        require(ownerOf(_tokenId) == msg.sender, "Not domain owner");
        require(domains[_tokenId].isActive, "Domain not active");
        require(domains[_tokenId].expiryDate > block.timestamp, "Domain expired");

        _transfer(msg.sender, _to, _tokenId);
        emit DomainTransferred(_tokenId, msg.sender, _to);
    }

    function setDomainMetadata(uint256 _tokenId, string memory _key, string memory _value) external {
        require(ownerOf(_tokenId) == msg.sender, "Not domain owner");
        require(domains[_tokenId].isActive, "Domain not active");

        domains[_tokenId].metadata[_key] = _value;
        emit MetadataUpdated(_tokenId, _key, _value);
    }

    function getDomainMetadata(uint256 _tokenId, string memory _key) external view returns (string memory) {
        require(_exists(_tokenId), "Domain does not exist");
        return domains[_tokenId].metadata[_key];
    }

    function isDomainExpired(uint256 _tokenId) external view returns (bool) {
        if (!_exists(_tokenId)) return true;
        return block.timestamp > domains[_tokenId].expiryDate;
    }

    function getExpiringDomains(uint256 _days) external view returns (uint256[] memory) {
        uint256 cutoffTime = block.timestamp + (_days * 1 days);
        uint256 count = 0;

        for (uint256 i = 1; i <= _tokenIdCounter; i++) {
            if (_exists(i) && domains[i].isActive && domains[i].expiryDate <= cutoffTime) {
                count++;
            }
        }

        uint256[] memory expiring = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 1; i <= _tokenIdCounter; i++) {
            if (_exists(i) && domains[i].isActive && domains[i].expiryDate <= cutoffTime) {
                expiring[index] = i;
                index++;
            }
        }

        return expiring;
    }

    function listDomainForAuction(uint256 _tokenId) external {
        require(ownerOf(_tokenId) == msg.sender, "Not domain owner");
        require(auctionContract != address(0), "Auction contract not set");
        require(domains[_tokenId].isActive, "Domain not active");

        approve(auctionContract, _tokenId);
    }

    function setAuctionContract(address _auctionContract) external onlyOwner {
        auctionContract = _auctionContract;
    }

    function reserveDomainName(string memory _name) external onlyOwner {
        reservedNames[_name] = true;
    }

    function unreserveDomainName(string memory _name) external onlyOwner {
        reservedNames[_name] = false;
    }

    function updateRegistrationFee(uint256 _newFee) external onlyOwner {
        registrationFee = _newFee;
    }

    function updateRenewalFee(uint256 _newFee) external onlyOwner {
        renewalFee = _newFee;
    }

    function emergencyExpire(uint256 _tokenId) external onlyOwner {
        require(_exists(_tokenId), "Domain does not exist");
        domains[_tokenId].isActive = false;
        domains[_tokenId].expiryDate = block.timestamp;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_exists(_tokenId), "Domain does not exist");
        
        Domain storage domain = domains[_tokenId];
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(string(abi.encodePacked(
                '{"name":"', domain.name, '",',
                '"description":"Fantasy Domain NFT",',
                '"attributes":[',
                '{"trait_type":"Domain Name","value":"', domain.name, '"},',
                '{"trait_type":"Registration Date","value":', toString(domain.registrationDate), '},',
                '{"trait_type":"Expiry Date","value":', toString(domain.expiryDate), '},',
                '{"trait_type":"Active","value":', domain.isActive ? 'true' : 'false', '}',
                ']}'
            ))))
        ));
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId > 0 && tokenId <= _tokenIdCounter;
    }
}

library Base64 {
    bytes internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        uint256 len = data.length;
        if (len == 0) return "";

        uint256 encodedLen = 4 * ((len + 2) / 3);

        bytes memory result = new bytes(encodedLen + 32);

        bytes memory table = TABLE;

        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)

            for {
                let i := 0
            } lt(i, len) {

            } {
                i := add(i, 3)
                let input := and(mload(add(data, i)), 0xffffff)

                let out := mload(add(tablePtr, and(shr(18, input), 0x3F)))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(12, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(6, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(input, 0x3F))), 0xFF))
                out := shl(224, out)

                mstore(resultPtr, out)

                resultPtr := add(resultPtr, 4)
            }

            switch mod(len, 3)
            case 1 {
                mstore(sub(resultPtr, 2), shl(240, 0x3d3d))
            }
            case 2 {
                mstore(sub(resultPtr, 1), shl(248, 0x3d))
            }

            mstore(result, encodedLen)
        }

        return string(result);
    }
}