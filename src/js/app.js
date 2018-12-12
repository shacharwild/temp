import $ from 'jquery';
import {parseCode} from './code-analyzer';
import {symbolicSubstitutionn} from './symbolicSubstitution';
import {ifElseLines} from './symbolicSubstitution';


$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let input = $('#inputBox').val();
        let table = parseCode(codeToParse); //return array with table data
        //makeTable(result);

        //new code's output
        let finalCode = symbolicSubstitutionn(codeToParse,input, table);
        showNewCode(finalCode);

        //insertArgsValues(input);
        //$('#parsedCode').val(html);

    });
});


//displays the new code
function showNewCode(finalCode){
    var html='';

    for (let i=0; i<finalCode.length;i++) {

        if (ifElseLines.has(i+'')) { // if its an if/else if line
            if (ifElseLines.get(i+'') == true)
                html += '<span>'+'<mark style="background-color:greenyellow">'  + finalCode[i].Line + '</mark>'+'</span>'; //true line
            else
                html += '<span>'+'<mark style="background-color:indianred">' + finalCode[i].Line + '</mark>'+'</span>' ; //false line
        }
        else
            html += '<span>'+finalCode[i].Line+'</span>';  // normal line
    }

    document.getElementById('newFunction').innerHTML = html;
}

//function countTabs(line){
//    var tabCount=0;
//    for (let i=0; i<line.length ;i++){
//        if (line[i]=='\t'){
//            tabCount++;
//        }
//    }
//    return tabCount;
//}


/*
//make table
function makeTable(result) {
    var html = '<table>';
    html += '<tr>';
    for( var j in result[0] ) {
        html += '<th>' + j + '</th>';
    }
    html += '</tr>';
    for( let i = 0; i < result.length; i++) {
        html += '<tr>';
        for( j in result[i] ) {
            let text=result[i][j];
            html += '<td >' + text + '</td>';
        }
    }
    html += '</table>';
    document.getElementById('finalTable').innerHTML = html;
}
*/