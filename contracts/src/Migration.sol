// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Eski (ECDSA) cüzdanların sahiplik kanıtını kabul edip kalıcı olarak
/// "migrate edildi" işaretleyen kontrat. Yeni PQ cüzdanına para taşıma mantığı
/// burada değil — sadece "bu ECDSA adresin sahibi benim" kanıtı ve tek kullanımlık
/// (bir daha asla kullanılamaz) işaretleme.
contract Migration {
    /// @dev secp256k1n / 2 — imza malleability koruması (OpenZeppelin ECDSA.sol
    /// ile aynı sabit). s bu değerin üzerindeyse imza reddedilir.
    uint256 private constant _SECP256K1N_HALF = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    /// @dev Bu kontrata özgü domain ayracı — PQWallet'ın execute() digest'iyle
    /// (docs/INTERFACE.md Bölüm 4, "PQSAFE_V1") karışmasın diye ayrı bir etiket
    /// kullanılıyor. chainid + address(this) aynı gerekçeyle var: cross-chain ve
    /// cross-contract replay'i önlemek.
    bytes32 public immutable MIGRATION_DOMAIN_SEPARATOR;

    /// @notice oldAddress => migrate edildi mi. Kalıcıdır, hiçbir yerde false'a dönmez.
    mapping(address => bool) public migrated;

    /// @notice oldAddress => hangi yeni (PQ) adrese migrate edildiği. Sadece kayıt amaçlı.
    mapping(address => address) public migratedTo;

    event MigrationProven(address indexed oldAddress, address indexed newAddress);

    error AlreadyMigrated(address oldAddress);
    error InvalidNewAddress();
    error InvalidSignatureLength(uint256 length);
    error InvalidSignatureSValue();
    error InvalidSignatureVValue(uint8 v);
    error InvalidSignature();

    constructor() {
        MIGRATION_DOMAIN_SEPARATOR = keccak256(abi.encode(keccak256("PQSAFE_MIGRATION_V1"), block.chainid, address(this)));
    }

    /// @notice `oldAddress`in sahibi olduğunu, o adresin private key'iyle
    /// (`oldAddress`, `newAddress`) çiftini imzalayarak kanıtlar. Başarılı olursa
    /// `oldAddress` kalıcı olarak işaretlenir, bir daha asla kullanılamaz.
    /// @param oldAddress Sahipliği kanıtlanacak eski ECDSA adresi.
    /// @param newAddress Bu eski adresin bağlandığı yeni (PQ) cüzdan adresi.
    /// @param signature `oldAddress`in private key'iyle personal_sign (EIP-191,
    /// "\x19Ethereum Signed Message:\n32" öneki) ile üretilmiş 65 baytlık imza.
    function proveOwnership(address oldAddress, address newAddress, bytes calldata signature) external {
        if (migrated[oldAddress]) revert AlreadyMigrated(oldAddress);
        if (newAddress == address(0)) revert InvalidNewAddress();

        bytes32 messageHash = keccak256(abi.encode(MIGRATION_DOMAIN_SEPARATOR, oldAddress, newAddress));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        address signer = _recover(ethSignedMessageHash, signature);
        if (signer == address(0) || signer != oldAddress) revert InvalidSignature();

        migrated[oldAddress] = true;
        migratedTo[oldAddress] = newAddress;

        emit MigrationProven(oldAddress, newAddress);
    }

    /// @dev Standart ecrecover sarmalayıcısı — OpenZeppelin ECDSA.sol ile aynı
    /// güvenlik kontrolleri (imza uzunluğu, low-s malleability, v in {27,28}).
    /// Kütüphane import etmek yerine elle yazıldı çünkü tek hazır ECDSA.sol
    /// kaynağı Akif'in `lib/sphincs-minus` submodule'ünün iç içe (nested)
    /// bağımlılığında duruyor — buna import bağımlılığı kurmak, Akif'in
    /// verifier'ı için gerekli o submodule'ün yapısına Migration.sol'ü
    /// gereksiz yere bağlar. ecrecover Solidity'nin kendi precompile'ı,
    /// ek bağımlılık gerektirmiyor.
    function _recover(bytes32 hash, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) revert InvalidSignatureLength(signature.length);

        bytes32 r = bytes32(signature[0:32]);
        bytes32 s = bytes32(signature[32:64]);
        uint8 v = uint8(signature[64]);

        if (uint256(s) > _SECP256K1N_HALF) revert InvalidSignatureSValue();
        if (v != 27 && v != 28) revert InvalidSignatureVValue(v);

        return ecrecover(hash, v, r, s);
    }
}
