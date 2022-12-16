pragma circom 2.1.2;
include "../../../../../node_modules/circomlib/circuits/escalarmulany.circom";
include "../../../../../node_modules/circomlib/circuits/escalarmulfix.circom";

// This code is a combination of 
// (https://github.com/factorgroup/nightmarket/blob/main/circuits/util/ecdh.circom) and 
// (https://github.com/privacy-scaling-explorations/maci/blob/master/circuits/circom/publickey_derivation.circom)
// combined such that there is only a single Num2Bits needed. Also updated with new anonymous 
// component syntax

// Returns the shared key derived from senderPrivateKey and receiverPublicKey, as well as ensuring 
// that the senderPublicKey does correspond to the senderPrivateKey
template CalcSharedKey() {
  // Use keyPair.privKey.asCircuitInputs() to get the correct value for this input
  signal input senderPrivateKey;
  signal input senderPublicKey[2];
  signal input receiverPublicKey[2];

  signal output out[2];

  signal privKeyBits[253] <== Num2Bits(253)(senderPrivateKey);

  // Checks that senderPrivateKey actually corresponds to senderPublicKey
  var BASE8[2] = [
    5299619240641551281634865583518297030282874472190772894086521144482721001553,
    16950150798460657717958625567821834550301663161624707787222815936182638968203
  ];

  signal pubKey[2] <== EscalarMulFix(253, BASE8)(privKeyBits);
  pubKey === senderPublicKey;

  // Generates the shared key
  out <== EscalarMulAny(253)(privKeyBits, receiverPublicKey);
}

// component main = CalcSharedKey();

/* INPUT = {
    "senderPrivateKey": "4666420237262245321499063121935770038540792828192482778223921013643526564486",
    "senderPublicKey": [ "2136132266816836193447047241150125714646307652110026603165813414981231478725", "9803768554805677298164533703883055699062993675463424167689898471267025507904" ],
    "receiverPublicKey": [ "5969408115709387483292888562547710290506048217392508606512845997808586567294", "7371001314778564810277304191776037255632674547510910954666812106837979786938" ]
} */
