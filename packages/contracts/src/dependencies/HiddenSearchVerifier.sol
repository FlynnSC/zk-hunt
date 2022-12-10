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
contract HiddenSearchVerifier {
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
            [13807195821455719731481322870425175768847795544571305406095357136146711810051,
             18678032584612895661933537553496575510979840997036780432795271513060818565308],
            [75085212729033821902057770051135473856949934184937503887958617350439479785,
             2793273754479531496509275928393547537052453832917068582689022198545466722270]
        );
        vk.IC = new Pairing.G1Point[](18);
        
        vk.IC[0] = Pairing.G1Point( 
            17231548750924120243645652548554158916369077115798411205123904228411064268766,
            12078096867571340734537858085555509336338046759307386671840303987165075258230
        );                                      
        
        vk.IC[1] = Pairing.G1Point( 
            444584702203711069882867753719515266322644016997310984297607577830582299409,
            18985045771036267086210893433595675661368943499063207683074639415246758003579
        );                                      
        
        vk.IC[2] = Pairing.G1Point( 
            14631244285930940430215335126355352449345600694924013654340934222219546114753,
            81962693362310520434900084890738449871939803261124180240415754382408350578
        );                                      
        
        vk.IC[3] = Pairing.G1Point( 
            7446823036643535100340675295985343491584343201332017448406890695215270868012,
            7878696748453933752225498928359540416879827625295672405124421542268752444173
        );                                      
        
        vk.IC[4] = Pairing.G1Point( 
            20705287340638010187919919330425517232395705711875322705487428972657439826443,
            9153864143622172438682231928225784730435317534573850362186838341488180284913
        );                                      
        
        vk.IC[5] = Pairing.G1Point( 
            8137743049208065720815218174945399565945407549821034789443278804862658625760,
            8450528154386452020477424251767893544735483049250952167245582168861595932395
        );                                      
        
        vk.IC[6] = Pairing.G1Point( 
            7827510632582391026784340878957260385366435755870870419583062472154351971222,
            16248507096124576566534508709105073610775407141130290210528096601975040843095
        );                                      
        
        vk.IC[7] = Pairing.G1Point( 
            13390533643906697860829079755835867133414015229605415712100857959089575514038,
            157901196965095167096499913154212646600831649732396297397629795901339994219
        );                                      
        
        vk.IC[8] = Pairing.G1Point( 
            16375608449018317441871432643125822516406370320644298896771271088844405489423,
            7497638494781219225120786817876851093010541703107158426214613796084510677956
        );                                      
        
        vk.IC[9] = Pairing.G1Point( 
            167973486653912122053236385134640517075785043106145172518008361609329852049,
            17276086745272138403760618605167836058980041311891711703017483816714175096669
        );                                      
        
        vk.IC[10] = Pairing.G1Point( 
            8957049542189497721031672190810040678812605626835497489738873079488666745398,
            13826189362044179216877081791024127332272890711749801822976341682003710216541
        );                                      
        
        vk.IC[11] = Pairing.G1Point( 
            15733917193094304909336122702138793736720575713783740756596453234679600418041,
            735628400238941930090936422608260428295413813507203488006583240151219456831
        );                                      
        
        vk.IC[12] = Pairing.G1Point( 
            9490181610809511888525478401438901923823818807490819751212786681663591423687,
            16411034324692969442364720181930542827099510169755103574088924426688726923796
        );                                      
        
        vk.IC[13] = Pairing.G1Point( 
            10746745030088525565582463037294807348593643815224325158579126923742503143926,
            3315774235000703816027886007541264907815909450816385234395405026566458790612
        );                                      
        
        vk.IC[14] = Pairing.G1Point( 
            18369510749694425945444542011039884923517347060725455759647194287620028000245,
            5585804539388705760439546616385390977330637545008589246985306067622309044583
        );                                      
        
        vk.IC[15] = Pairing.G1Point( 
            16333644107624461931595351762927670141217010788588168670682867659309431161449,
            3453616300575432678321209482070636526874314973279597248761870499451877514856
        );                                      
        
        vk.IC[16] = Pairing.G1Point( 
            18929786288416044124381868910311488746407106022898623409443551603017211500855,
            10324018271286091558425603720592756784008969128919528564787499218353966708204
        );                                      
        
        vk.IC[17] = Pairing.G1Point( 
            18565067037030222808405877163391875135650297492958362430242786458783364236048,
            2323002011352787306191770629075736593522475921156346779123829291206113105330
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
            uint[17] memory input
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
