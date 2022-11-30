//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// 2019 OKIMS
//      ported to solidity 0.6
//      fixed linter warnings
//      added requiere error messages
//
//
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;
library Pairing {
    struct G1Point {
        uint X;
        uint Y;
    }
    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint[2] X;
        uint[2] Y;
    }
    /// @return the generator of G1
    function P1() internal pure returns (G1Point memory) {
        return G1Point(1, 2);
    }
    /// @return the generator of G2
    function P2() internal pure returns (G2Point memory) {
        // Original code point
        return G2Point(
            [11559732032986387107991004021392285783925812861821192530917403151452391805634,
             10857046999023057135944570762232829481370756359578518086990519993285655852781],
            [4082367875863433681332203403145435568316851327593401208105741076214120093531,
             8495653923123431417604973247489272438418190587263600148770280649306958101930]
        );

/*
        // Changed by Jordi point
        return G2Point(
            [10857046999023057135944570762232829481370756359578518086990519993285655852781,
             11559732032986387107991004021392285783925812861821192530917403151452391805634],
            [8495653923123431417604973247489272438418190587263600148770280649306958101930,
             4082367875863433681332203403145435568316851327593401208105741076214120093531]
        );
*/
    }
    /// @return r the negation of p, i.e. p.addition(p.negate()) should be zero.
    function negate(G1Point memory p) internal pure returns (G1Point memory r) {
        // The prime q in the base field F_q for G1
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (p.X == 0 && p.Y == 0)
            return G1Point(0, 0);
        return G1Point(p.X, q - (p.Y % q));
    }
    /// @return r the sum of two points of G1
    function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
        uint[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success,"pairing-add-failed");
    }
    /// @return r the product of a point on G1 and a scalar, i.e.
    /// p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all points p.
    function scalar_mul(G1Point memory p, uint s) internal view returns (G1Point memory r) {
        uint[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require (success,"pairing-mul-failed");
    }
    /// @return the result of computing the pairing check
    /// e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
    /// For example pairing([P1(), P1().negate()], [P2(), P2()]) should
    /// return true.
    function pairing(G1Point[] memory p1, G2Point[] memory p2) internal view returns (bool) {
        require(p1.length == p2.length,"pairing-lengths-failed");
        uint elements = p1.length;
        uint inputSize = elements * 6;
        uint[] memory input = new uint[](inputSize);
        for (uint i = 0; i < elements; i++)
        {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }
        uint[1] memory out;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success,"pairing-opcode-failed");
        return out[0] != 0;
    }
    /// Convenience method for a pairing check for two pairs.
    function pairingProd2(G1Point memory a1, G2Point memory a2, G1Point memory b1, G2Point memory b2) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](2);
        G2Point[] memory p2 = new G2Point[](2);
        p1[0] = a1;
        p1[1] = b1;
        p2[0] = a2;
        p2[1] = b2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for three pairs.
    function pairingProd3(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](3);
        G2Point[] memory p2 = new G2Point[](3);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for four pairs.
    function pairingProd4(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2,
            G1Point memory d1, G2Point memory d2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](4);
        G2Point[] memory p2 = new G2Point[](4);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p1[3] = d1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        p2[3] = d2;
        return pairing(p1, p2);
    }
}
contract HiddenSearchLiquidationVerifier {
    using Pairing for *;
    struct VerifyingKey {
        Pairing.G1Point alfa1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[] IC;
    }
    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }
    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alfa1 = Pairing.G1Point(
            15279376802771412609914454314263263944500493665706456216527292218181465568079,
            20216032777781325964998177775933908438201106202272100050207670458706206216319
        );

        vk.beta2 = Pairing.G2Point(
            [19697723184843227611966456188752873592811174181177008354979604000938327645021,
             10330552924149856244386705712622633038617516168944713251853618850632958240539],
            [2019315865916222862044408832755847561622549336780319736662115742902361393144,
             7102723144952217310228937148627412422914857179077966537221659335195617939397]
        );
        vk.gamma2 = Pairing.G2Point(
            [11559732032986387107991004021392285783925812861821192530917403151452391805634,
             10857046999023057135944570762232829481370756359578518086990519993285655852781],
            [4082367875863433681332203403145435568316851327593401208105741076214120093531,
             8495653923123431417604973247489272438418190587263600148770280649306958101930]
        );
        vk.delta2 = Pairing.G2Point(
            [1337934027447763896753879572898592687892722362076539228709518865933635138999,
             12425301145117072140814364718015872566358721985055930024965678702603285607926],
            [20725187302519627714259149419435981764634196383395141536260992743068479712690,
             14167212177989664237795475792846853782229432648152413734774024721823401574677]
        );
        vk.IC = new Pairing.G1Point[](21);
        
        vk.IC[0] = Pairing.G1Point( 
            19018096686096784049745041533401696928496099229878956409118259205470278109264,
            43849955560790566342618256634566427316192245511422573862200811105673482491
        );                                      
        
        vk.IC[1] = Pairing.G1Point( 
            4737044024538140418303661625384816750440362507636855994736370695276365234144,
            11476795343867465541943087711418291960009531563313732071250054645991832103750
        );                                      
        
        vk.IC[2] = Pairing.G1Point( 
            6214091743212217575974785382983676567635872507974080737793404145067506652568,
            6281711330322694665612009859129370248778792397348756218631507515388222076373
        );                                      
        
        vk.IC[3] = Pairing.G1Point( 
            10440739265941821920449149407680615046136619390008223600589471187511649309714,
            4840703053806513803251021332623766592122403447358499936091841545108879145727
        );                                      
        
        vk.IC[4] = Pairing.G1Point( 
            17539319397242022478427565458363639789654666785137613969302537231815067784533,
            12171871925915616762430084280864827022207200679258630147251595737079023492865
        );                                      
        
        vk.IC[5] = Pairing.G1Point( 
            1486819382324881446560654621918529778546835572403919826521478797581276590450,
            8604173799082146671172842130307125868162831863339277834430804638213097517184
        );                                      
        
        vk.IC[6] = Pairing.G1Point( 
            18993522612752825080121315606609036540362727934568272577565915793157719191606,
            6391942612744806509452386883021704151107582739660014404076975951991384908863
        );                                      
        
        vk.IC[7] = Pairing.G1Point( 
            1236557909689313616244722170816899470227265212292655002768779052864349300359,
            16278051435294988795122911939720986560403246910190196405785701611807204817696
        );                                      
        
        vk.IC[8] = Pairing.G1Point( 
            14593934251140337439937158989100788193679417942367875593647895846953876007540,
            5200996306433742125920502631094422972554796293945878940081587099918554873693
        );                                      
        
        vk.IC[9] = Pairing.G1Point( 
            13722757387324422781473844111883497319953817595034317076257267784845662667556,
            21795842179448401549393109853060954932992834600899949568299961943363846555473
        );                                      
        
        vk.IC[10] = Pairing.G1Point( 
            10010540234036308053309414397835991923476782825770993541319051118074668825468,
            1096805147705999034835719047642826771766719544332202110962620593469456597501
        );                                      
        
        vk.IC[11] = Pairing.G1Point( 
            9545332149522433484700542396580987739123820416790712648212648175915994365904,
            16296370471858130270236834343374447478407004942934573713571310802880277985093
        );                                      
        
        vk.IC[12] = Pairing.G1Point( 
            1328886793955663389029514845373530427488377016249290742372967715727719530619,
            14812575022923532915077348276614703082577354264485830472930572296529987268446
        );                                      
        
        vk.IC[13] = Pairing.G1Point( 
            15739344760904512245953748296577992508471605403535740199502849633701182393313,
            15603620029730848706969419942153134181750577984282759021931956792912660169508
        );                                      
        
        vk.IC[14] = Pairing.G1Point( 
            8679611763007562771054226494173327053452012959483107712491578995923910735206,
            7877841543488009557058121644314415661321545131845402206011326359316379789275
        );                                      
        
        vk.IC[15] = Pairing.G1Point( 
            14514714427352792305108668939266209745178821953344755160501817396061865357735,
            14665895605971195580984960961711429083612726834383086781952566439925162273502
        );                                      
        
        vk.IC[16] = Pairing.G1Point( 
            15108620318108556051590408856903166620891643097814337833814891108373521362659,
            1747922617375264408679555603639150280193873747919617608166832775289054640256
        );                                      
        
        vk.IC[17] = Pairing.G1Point( 
            6228882378335731072213157678624804145225209793239531382899082952421762134814,
            9470443049074695488732489103544930928103493237075137910522370363319882148613
        );                                      
        
        vk.IC[18] = Pairing.G1Point( 
            18416738272647642508649874950135105226601660143453464877149163656524996603068,
            14963330377522872061463489931516364860988151304508832831821603872756585177106
        );                                      
        
        vk.IC[19] = Pairing.G1Point( 
            4824042130993630679798569417237966380967648077576521986078198382970548697025,
            6881611965213265947496849461401249913073360914112819205412100508018498477778
        );                                      
        
        vk.IC[20] = Pairing.G1Point( 
            8445803079693898004763049179843137428031224904029911485387506380847116661533,
            762280536297997032039486298315896649129897232578300000427018801377280550379
        );                                      
        
    }
    function verify(uint[] memory input, Proof memory proof) internal view returns (uint) {
        uint256 snark_scalar_field = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        VerifyingKey memory vk = verifyingKey();
        require(input.length + 1 == vk.IC.length,"verifier-bad-input");
        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        for (uint i = 0; i < input.length; i++) {
            require(input[i] < snark_scalar_field,"verifier-gte-snark-scalar-field");
            vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[i + 1], input[i]));
        }
        vk_x = Pairing.addition(vk_x, vk.IC[0]);
        if (!Pairing.pairingProd4(
            Pairing.negate(proof.A), proof.B,
            vk.alfa1, vk.beta2,
            vk_x, vk.gamma2,
            proof.C, vk.delta2
        )) return 1;
        return 0;
    }
    /// @return r  bool true if proof is valid
    function verifyProof(
            uint[8] memory proofData,
            uint[20] memory input
        ) public view returns (bool r) {
        Proof memory proof;
        proof.A = Pairing.G1Point(proofData[0], proofData[1]);
        proof.B = Pairing.G2Point([proofData[2], proofData[3]], [proofData[4], proofData[5]]);
        proof.C = Pairing.G1Point(proofData[6], proofData[7]);
        uint[] memory inputValues = new uint[](input.length);
        for(uint i = 0; i < input.length; i++){
            inputValues[i] = input[i];
        }
        if (verify(inputValues, proof) == 0) {
            return true;
        } else {
            return false;
        }
    }
}
