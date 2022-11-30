pragma circom 2.1.2;
include "../../../../../node_modules/circomlib/circuits/escalarmulany.circom";
include "../../../../../node_modules/circomlib/circuits/escalarmulfix.circom";

// This code is a combination of 
// (https://github.com/factorgroup/nightmarket/blob/main/circuits/util/ecdh.circom) and 
// (https://github.com/privacy-scaling-explorations/maci/blob/master/circuits/circom/publickey_derivation.circom)
// combined such that there is only a single Num2Bits needed

// Returns the shared key derived from senderPrivateKey and receiverPublicKey, as well as ensuring 
// that the senderPublicKey does correspond to the senderPrivateKey
template CalcSharedKey() {
  // Use keyPair.privKey.asCircuitInputs() to get the correct value for this input
  signal input senderPrivateKey;
  signal input senderPublicKey[2];
  signal input receiverPublicKey[2];

  signal output out[2];

  component privBits = Num2Bits(253);
  privBits.in <== senderPrivateKey;

  // Checks that senderPrivateKey actually corresponds to senderPublicKey
  var BASE8[2] = [
    5299619240641551281634865583518297030282874472190772894086521144482721001553,
    16950150798460657717958625567821834550301663161624707787222815936182638968203
  ];

  component mulFix = EscalarMulFix(253, BASE8);
  for (var i = 0; i < 253; i++) {
    mulFix.e[i] <== privBits.out[i];
  }

  mulFix.out[0] === senderPublicKey[0];
  mulFix.out[1] === senderPublicKey[1];

  // Generates the shared key
  component mulAny = EscalarMulAny(253);
  mulAny.p[0] <== receiverPublicKey[0];
  mulAny.p[1] <== receiverPublicKey[1];

  for (var i = 0; i < 253; i++) {
    mulAny.e[i] <== privBits.out[i];
  }

  out[0] <== mulAny.out[0];
  out[1] <== mulAny.out[1];
}

// component main = CalcSharedKey();

/* INPUT = {
    "senderPrivateKey": "4666420237262245321499063121935770038540792828192482778223921013643526564486",
    "senderPublicKey": [ "2136132266816836193447047241150125714646307652110026603165813414981231478725", "9803768554805677298164533703883055699062993675463424167689898471267025507904" ],
    "receiverPublicKey": [ "5969408115709387483292888562547710290506048217392508606512845997808586567294", "7371001314778564810277304191776037255632674547510910954666812106837979786938" ]
} */
