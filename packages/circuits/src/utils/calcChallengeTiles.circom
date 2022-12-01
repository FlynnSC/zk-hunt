pragma circom 2.1.2;

include "calcMerkleRoot.circom";
include "isEqualToAny.circom";
include "calcMerkleRoot.circom";

// Outputs challenge tiles based on the supplied ofsets and position, and verifies that the 
// challenge tiles offsets are valid
template CalcChallengeTiles() {
    var tileCount = 4;

    signal input x;
    signal input y;
    signal input challengeTilesOffsetsXValues[tileCount];
    signal input challengeTilesOffsetsYValues[tileCount];
    
    signal output challengeTilesXValues[tileCount];
    signal output challengeTilesYValues[tileCount];

    var directionCount = 32;
    var offsetRootList[directionCount] = [
        8064922012225928546443258086527263208868089486546406649922835270640116007519,
        11697654165720819748772011009203187644166088452598222000098975315328236221582,  
        1800923358916051152594512062420050486913523581714347387030270210083203294364,  
        4844833799078321459316190341427220498550304768652417831742703590326331187371,  
        21771054893639295328289742600234163733174728171840220952740835886926151197684,  
        15770737618454781337582866810965392868916235508672255803530239100992910325400,  
        17552331021573639328247489040916542669735149440205448796290544082021181687828,  
        7466667602117510650167932096305216581779834082567721090007427253776618040413,  
        13561245368002431558424633190218908160869454185332403167531121604115885491678,  
        6681228048654935837785513255926370252642350887153989294643471335821668951431,  
        9757862531355976237778433359140475580117387774787157384413123115365561787026,  
        1834212506634129125406583528882467074720644810403837576620775756147553765416,  
        2304158710300546927861191935173517948721924161625644542243940926385959782807,  
        1672590635838679483313135056797046795968840629289325296776514906327880271873,  
        16989595692585435949050096594608350595705087042452341237199670574663282451884,  
        7142605451290999351004232251091690933774254139811595621053809233359684376409,  
        88520140247697604200162269242788487095506754395889155561696938068724804017,  
        578599767467166175190690867567265619198212062103534979230908555229580923666,  
        5719858701182344033567117652083594958518086215424351404182115083906608544481,  
        16145118302829435859414443262529906918825604584560389716923750421734435068420,  
        17805232390813963305403284326240529275310666364113565324968510063069327108531, 
        9142281656583412238476567992176464398621856814134920394506084522672037694377,  
        4927110739133637242022389199794219909525729963893459711875358164457847862479,  
        1072859101104901904008374407308149007369922208670764459538333298023663271483,  
        8497205564236379055047558213239528720057274867100269283353696934548372742976,  
        4598640852634352204349046940979358435975618677782921151920917694109308385354,  
        16154882983881508907035294144291589587886974651506200143698779614356443894316,  
        7818256461619192338199408878436240738357927815809029543713088163870268123550,  
        1711165990797212128832591372711397451486113735966528244212317883733537974952,  
        17202306021100318488682901628832848913538486360978090316725947756842679154466,  
        8195065307102730891664800999552833833193042002144607037520060695259890388558,  
        16883289566564858605999030564542594641240714115464839914838286232776712630533
    ];

    // Calculates the merkle chain root of the challenge tiles offsets, and calculates and outputs
    // the resulting challenge tiles
    component calcMerkleChainRoot = CalcMerkleChainRoot(2 * tileCount);
    for (var i = 0; i < tileCount; i++) {
        calcMerkleChainRoot.in[2 * i] <== challengeTilesOffsetsXValues[i];
        calcMerkleChainRoot.in[2 * i + 1] <== challengeTilesOffsetsYValues[i];

        challengeTilesXValues[i] <== x + challengeTilesOffsetsXValues[i];
        challengeTilesYValues[i] <== y + challengeTilesOffsetsYValues[i];
    }

    // Verifies that the challenge tiles offsets are valid
    component isEqualToAny = IsEqualToAny(directionCount);
    isEqualToAny.value <== calcMerkleChainRoot.out;
    for (var i = 0; i < directionCount; i++) {
        isEqualToAny.equalTo[i] <== offsetRootList[i];
    }

    isEqualToAny.out === 1;
}