import * as esprima from 'esprima';
import * as escodegen from 'escodegen';


let globals = new Map();
let statements=[];
let functionArgs=[];
let input='';  //input of the args (values)
let finalCode=[];
var code=[];
let countOld;
let funcFlag=false; //checks if in function
let countInitVars; //for cases such as: let a,b,c
let newVarLine;
let operators='/+-* ';
let kaleidoStar=[];

let ifElseLines = new Map(); // <number of line, true/false>

let countStatements; //counts the number of statements
let numArgs=0; //counts how many function's args there r
let argsSoFar=0; //how many args we've been to SO FAR


const statementType = {
    'variable declaration' : handleVarDec,
    'else statement': handleIf,
    'while statement': handleIf,
    'if statement': handleIf,
    'else if statement': handleIf,
    'return statement': handleReturn,
    'assignment expression': handleAssignment
};


export {insertArgsValues};
export {ifElseLines};
export{convertToString};
export {symbolicSubstitutionn};

function countArgs(){
    for (let i=0; i<statements.length; i++){
        if (statements[i].Type=='variable declaration' && statements[i].Value===''){
            numArgs++;
        }
    }
}
function symbolicSubstitutionn(codeToParse, givenInput, resultt){
    input=givenInput;
    countInitVars=1; //how many vars are declared in a row
    newVarLine=true; //if a new vardeclaration line
    countOld=0;
    code=codeToParse.split('\n');
    //statements=result;
    statements=resultt;
    finalCode=[];
    funcFlag=false; //checks if im in a function or not
    countStatements=0;
    let locals = new Map(); //local vars for each scope
    countArgs(); //count how many function args there are
    bodyLines(code.length, locals); //goes through all statements.

    addRestOfCode(finalCode);
    return finalCode;
}

function bodyLines(endBlock, locals){
    while (countOld<endBlock && countStatements<statements.length){
        let statement = statements[countStatements];
        skipEmptyLines(finalCode); //skip empty lines or add lines with only '}'
        if (countOld>=endBlock)
            continue;

        if (statement.Type == 'FunctionDeclaration') {
            funcFlag = addFunctionDec(funcFlag, finalCode);
            countStatements++; //next statement
            continue;
        }
        countStatements++;
        statementType[statement.Type](statement, locals); //handle each type of statement
    }
}

function checkIfToInsertInput(){
    if (argsSoFar==numArgs)
        insertArgsValues(input);
}

//1
function handleVarDec(statement, locals){
    if (statement.Value==='') { //if it's arguments of the function
        globals.set(statement.Name + '', '');
        functionArgs.push({arg: statement.Name + ''});
        argsSoFar++;
        checkIfToInsertInput();
    }
    else if (funcFlag==true) {//if local var (inside the function)
        var newValue = insertLocal(statement.Name, statement.Value + '', finalCode, locals);
        locals.set(statement.Name + '', newValue);

    }
    else { //outside the function
        globals.set(statement.Name + '', statement.Value);
        finalCode.push({Line: code[countOld]});
        countOld++;}
}

//2
function handleElse(statement, locals){
    kaleidoStar.push({sora:statement, layla:locals});
    var elseStart=code[countOld];
    finalCode.push({Line: elseStart});
    countOld++;
}

//3
function handleConditionStatement(statement,locals) {
    let newCondition = handleCondition(esprima.parseScript(statement.Condition + ''), finalCode, true, locals);
    var close='';
    if (code[countOld][code[countOld].length-1]=='{')
        close='{';
    finalCode.push({Line: code[countOld].substring(0, code[countOld].indexOf('(')) + '(' + newCondition + ')'+close});
    countOld++;
    if (statement.Type == 'if statement' || statement.Type == 'else if statement') {
        var condtionResult = conditionResult(newCondition);
        ifElseLines.set((finalCode.length - 1) + '', condtionResult);
    }
}

//4
function handleReturn(statement, locals){
    var returnStart=code[countOld].substring(0,code[countOld].indexOf('return')+6);
    if (globals.has(statement.Value)) {
        countOld++;
        finalCode.push({Line: returnStart + ' ' + statement.Value + ';'});
    }
    else{
        var newValue = returnStatement(statement.Value + '', locals);
        finalCode.push({Line:returnStart+' '+newValue+';'});}
}

//5
function handleAssignment(statement, locals){
    var assStart=code[countOld].substring(0, code[countOld].indexOf('='));
    var newValue = assignmentLocal(statement.Name, statement.Value + '', locals); //check right side
    if (checkIfComputed(assStart)==true) { //if left is computed value
        var computedLeft = checkComputedValue(assStart+'', locals).computedValue; //replace computed left side
        if (globals.has(computedLeft.substring(0,computedLeft.indexOf('[')))){ //if left is global
            replaceArrayValue(computedLeft, newValue,globals);
            finalCode.push({Line:computedLeft+'='+newValue+';'});
        }
        else if (locals.has(computedLeft.substring(0,computedLeft.indexOf('[')))) //if left is local
            replaceArrayValue(computedLeft,newValue,locals);
    }
    else { //if left is not computed value, only regular var -> x=5;
        if (globals.has(statement.Name)) {
            finalCode.push({Line: assStart + '=' + newValue + ';'});
            globals.set(statement.Name + '', newValue);
        }
        else {
            locals.set(statement.Name + '', newValue);
        }}}


//check if leftSide is computedValue
function checkIfComputed(value){
    if (canBeparsed(value)) {
        var parsedValue = esprima.parseScript(value + '');
        if (parsedValue.body[0].expression.type=='MemberExpression')
            return true;
    }
    return false;
}

function replaceArrayValue(left,newValue, dic){
    let right = dic.get(left.substring(0,left.indexOf('['))); //get array value [1,2,3]
    let index=left.substring(left.indexOf('[')+1, left.indexOf(']')); //in this index i want to replace the value in the array
    right=right.substring(1, right.length-1); //remove [ and ]
    var arr=right.split(',');
    arr[index]=newValue;
    right='[';
    for (let i=0; i<arr.length ;i++){
        right+=arr[i];
        if (i<arr.length-1)
            right+=',';
    }
    right+=']';
    dic.set(left.substring(0, left.indexOf('[')), right);
}

//6
function handleIf(statement, locals){
    var endBlock=findNewBlock();
    var newLocals = localsToTemp(locals);

    if (statement.Type=='else statement') //if its else statement
        handleElse(statement,locals);
    else
        handleConditionStatement(statement, newLocals); // while/if/ else if

    bodyLines(endBlock, newLocals);

}

function findNewBlock() {
    var currentLine=code[countOld];
    var lastIndex = currentLine[currentLine.length-1];
    var countTemp = countOld+1 ;
    var temp = (code[countTemp]);
    var pairs=0;

    if (lastIndex=='{'){
        pairs++;
    }
    if (temp.includes('{')){
        pairs++;
        countTemp++;
    }
    temp=code[countTemp];
    countTemp = searchEndBlock(pairs,temp,countTemp);
    return countTemp; //end index of block
}

function searchEndBlock(pairs, temp, countTemp){
    while (pairs>0) {
        if (temp.includes('}'))
            pairs--;
        if (pairs==0)  //found end of block
            break;
        if (temp.includes('{'))
            pairs++;

        countTemp++;
        temp=code[countTemp];
    }
    return countTemp;
}

function handleCondition(condition, finalCode, firstTime,locals){
    var left,right=[];
    var operator='';
    if (firstTime) {
        if ((condition.body)[0].expression.type == 'BinaryExpression' || (condition.body)[0].expression.type == 'LogicalExpression') {
            operator = (condition.body)[0].expression.operator;
            left = (condition.body)[0].expression.left;
            right = (condition.body)[0].expression.right;
        }
        else if ((condition.body)[0].expression.type == 'MemberExpression')
            return memberExpressionValue((condition.body)[0].expression,locals);
        else //Identifier  -> if (sora)
            return IdentifierValue((condition.body)[0].expression, locals);}
    else{
        left=condition.left;
        right=condition.right;
        operator=condition.operator;}
    var addLeft=handleLeft(left,locals);   //left
    var addRight=handleRight(right,locals); //right
    return addLeft+' '+operator+' '+addRight; } //new line


function handleLeft(left,locals){
    var addLeft='';
    if (left.type=='BinaryExpression') {//if left is binaryExpression
        addLeft = '('+handleCondition(left, finalCode, false, locals)+')';
    }
    else if (left.type=='MemberExpression'){
        addLeft=memberExpressionValue(left,locals);
    }
    else{
        if (left.type=='Literal')
            addLeft=left.value+'';
        else{
            addLeft=left.name;
            if (locals.has(addLeft)) {
                addLeft = locals.get(addLeft);
            }}}
    return addLeft;
}

function checkIfString(value){
    if (/^[a-zA-Z]+$/.test(value) && !globals.has(value))
        return '"'+value+'"';
    return value;

}
function handleRight(right,locals){
    var addRight='';
    if (right.type=='BinaryExpression') //if right is binaryExpression
        addRight = '('+handleCondition(right, finalCode, false, locals)+')';
    else if (right.type=='MemberExpression'){
        addRight=memberExpressionValue(right,locals);
    }
    else{
        if (right.type=='Literal') {
            addRight = right.value + '';
        }
        else{
            addRight=right.name;
            if (locals.has(addRight)) {
                addRight = locals.get(addRight);
            }}}
    return addRight;
}


function IdentifierValue(value,locals){
    if (locals.has(value.name))
        return locals.get(value.name);
    return value.name;
}
function memberExpressionValue(value,locals){
    var object=value.object.name;
    if (locals.has(object))
        object=locals.get(object);

    return checkProperty(value,object,locals);
}

function checkProperty(value,object,locals){
    var addValue='';
    if (value.property.name!=null) {
        if (value.property.name=='length')
            return object+'.'+'length';
        if (locals.has(value.property.name))
            addValue=object+'['+locals.get(value.property.name)+']';
        else
            addValue = object+'['+value.property.name+']';
    }
    else if (value.property.value!=null)
    {
        addValue=value.property.value;
        addValue = object+'['+addValue+']';
    }
    return addValue;
}
function insertLocal(name, value, finalCode, locals){
    if (!locals.has(name)){ locals.set(name, '');}
    var currentLine =code[countOld];
    var newValue='';
    if (value!='null(or nothing)') { //if the variable is initialized
        var vars = value.split(/[()\s+-]+/);
        for (let i = 0; i < vars.length; i++) {
            let check = vars[i] + '';
            var replaceComputedIndex=currentLine.indexOf(check); //check if check is computeted value (x[5]):
            var checkk = checkComputedValue(check+'', locals);
            if (checkk.wasReplaced==true) { //if it was a computed value and was replaced
                currentLine = insertNewComputedValue(checkk.computedValue, currentLine, replaceComputedIndex, vars[i]);
                continue;}
            else{ check=vars[i]+'';}
            currentLine= updateLineLocal(currentLine,locals,check);}
        newValue = currentLine.substring(currentLine.indexOf('=') + 1, currentLine.indexOf(';')); //insert to locals
        newValue=newValue.replace(/\s/g, '');
        countOld++;}
    else{ noInitLocals(currentLine);} //let a,b,c
    return newValue;}


//vars without Init (let x;)
function noInitLocals(currentLine){
    if (newVarLine==true) {
        countInitVars = currentLine.split(',').length;
        newVarLine=false;
    }
    if (countInitVars==1) {
        countOld++;
        newVarLine=true;
    }
    else
        countInitVars--;

}
//continue of insertLocal
function updateLineLocal(currentLine,locals,check){
    if (locals.has(check)) {
        var replaceIndex = currentLine.indexOf(check);
        var newVar = locals.get(check);
        if (newVar!='0')
            currentLine = currentLine.substring(0, replaceIndex) + '('+newVar +')' +currentLine.substring(replaceIndex + check.length);
        else
            currentLine=currentLine.substring(0, replaceIndex)+currentLine.substring(replaceIndex + check.length);
    }
    return currentLine;

}
function assignmentLocal(name, value, locals){
    var vars = value.split(/[\s+)(]+/);
    for (let i=0; i<vars.length;i++){
        let check=vars[i]+'';

        var replaceComputedIndex=value.indexOf(check);         //check if check is computeted value (x[5]):
        var checkk = checkComputedValue(check+'', locals);
        if (checkk.wasReplaced==true) { //if it was a computed value and was replaced
            value = insertNewComputedValue(checkk.computedValue, value, replaceComputedIndex, vars[i]);
            continue;
        }
        else
            check=vars[i]+'';
        value = updateAssNewValue(check,locals,value); //update value line
    }
    value=value.replace(/\s/g, '');
    countOld++;
    return value;
}

//update value line
function updateAssNewValue(check,locals,value){
    if (locals.has(check)){ //definitely not a computeted value
        var replaceIndex=value.indexOf(check);
        var newVar = locals.get(check);
        if (newVar!='0')
            value=value.substring(0, replaceIndex)+'('+newVar+')'+value.substring(replaceIndex+check.length);
        else
            value=value.substring(0, replaceIndex)+value.substring(replaceIndex+check.length+2);
    }
    return value;
}
//check if check is computeted value - (x[5]):
function checkComputedValue(value, locals) {

    var isLegal = canBeparsed(value);
    if (isLegal == true) {
        return handleComputedValue(value, locals);
    }
    else {
        return {computedValue: value, wasReplaced: false};
    }
    //return {computedValue: value, wasReplaced: false};}
}


function canBeparsed(value){
    if (operators.includes(value)) //check if value is operator or space
        return false;
    return true;

}

function handleComputedValue(value,locals){
    var wasReplaced = false;
    if (esprima.parseScript(value+'').body[0]!=null) {
        var checkValue = (esprima.parseScript(value+'').body)[0].expression;
        if (checkValue.type == 'MemberExpression') {
            var object = checkValue.object.name;
            var property = '';
            var ans=wasReplacedCheck(locals,object,wasReplaced);
            wasReplaced=ans[0].flag;
            object=ans[0].objectt;
            if (checkValue.property.name != null) { //if x[5] and not 1[5]
                property = checkValue.property.name;}
            else
                property = checkValue.property.value;
            if (locals.has(property)) {
                property = locals.get(property);
                wasReplaced = true;}
            return {computedValue: object + '[' + property + ']', wasReplaced: wasReplaced};}
        return {computedValue: value, wasReplaced: wasReplaced}; }
}
function wasReplacedCheck(locals,object,wasReplaced){
    if (locals.has(object)) { //get object
        object = locals.get(object);
        wasReplaced = true;
    }
    var toReturn =[];
    toReturn.push({flag: wasReplaced, objectt: object});
    return toReturn;
}
function insertNewComputedValue(value, currentLine, replaceIndex, oldValue){
    currentLine = currentLine.substring(0, replaceIndex) + '('+value +')' +currentLine.substring(replaceIndex + oldValue.length);
    return currentLine;
}


function returnStatement(value, locals){
    var vars = value.split(/[\s+()-]+/);
    for (let i = 0; i < vars.length; i++) {
        let check = vars[i] + '';
        var replaceComputedIndex=value.indexOf(check); //check if check is computeted value (x[5]):
        var checkk = checkComputedValue(check+'', locals);
        if (checkk.wasReplaced==true) { //if it was a computed value and was replaced
            value = insertNewComputedValue(checkk.computedValue, value, replaceComputedIndex, vars[i]);
            continue;}
        if (locals.has(check)) {
            var replaceIndex = value.indexOf(check);
            var newVar = locals.get(check);
            value = value.substring(0, replaceIndex) + '('+newVar+')' + value.substring(replaceIndex + check.length);
        }}
    if (value[0] == ' ')
        value = value.substring(1);
    value=value.replace(/\s/g, '');
    countOld++;
    return value;
}

function addFunctionDec(flag, finalCode){
    if (flag==false) {
        let funcLine=code[countOld];
        finalCode.push({Line: funcLine});
        countOld++;
    }
    return true;
}

//init scopeLocals and transfer from locals to it.
function localsToTemp(locals){
    let tempScopeLocals=new Map();

    for (let [k, v] of locals) {
        tempScopeLocals.set(k,v);
    }
    return tempScopeLocals;
}

function skipEmptyLines(finalCode){
    var x=true;
    while (x) {
        var stop = false;
        var sograim=false;
        var lie=false;
        var flags=[];

        flags=emptyLinesHelp1(lie,sograim,stop);
        lie=flags[0].flag;
        sograim=flags[1].flag;
        stop=flags[2].flag;
        if (!lie && sograim)
            finalCode.push({Line: code[countOld]});
        if (stop==true)
            break;
        else{
            countOld++;
            continue;
        }}}

function emptyLinesHelp1(lie,sograim,stop){
    var flags=[];
    for (let i = 0; i < code[countOld].length && !stop; i++) {
        flags = emptyLinesHelp2(lie,sograim,stop,i);
        lie=flags[0].flag;
        sograim=flags[1].flag;
        stop=flags[2].flag;
    }
    flags = [];
    flags.push({flag: lie},{flag:sograim}, {flag:stop});
    return flags;
}
function emptyLinesHelp2(lie,sograim,stop,i){
    if (code[countOld][i] != ' ' && code[countOld][i] != '}' ){
        stop = true;
        lie=true;
        sograim=false;
    }
    else if (code[countOld][i] == '}')
        sograim=true;
    var flags = [];
    flags.push({flag: lie},{flag:sograim}, {flag:stop});
    return flags;

}

//add the rest of the code.
function addRestOfCode(finalCode){
    for (let i=countOld; i<code.length ; i++){
        finalCode.push({Line: code[i]});
    }
}
//insert input values to the function args
function insertArgsValues(input){
    var argIndex=0;
    while (input.length>0){
        if (input[0]=='['){
            var endArg = input.indexOf(']')+1;
            globals.set(functionArgs[argIndex].arg+'', input.substring(0, endArg));
            argIndex++;
            if (endArg<input.length) { //has more arguments
                input=input.substring(endArg+1);}
            else
                break;}
        else{
            var psikIndex=input.indexOf(','); //has an argument
            if (psikIndex>-1){
                globals.set(functionArgs[argIndex].arg+'', input.substring(0, psikIndex));
                input=input.substring(psikIndex+1);
                argIndex++;}
            else {
                globals.set(functionArgs[argIndex].arg + '', input); //last argument
                break;}}}}


function conditionResult(condition){
    var parsedCond = esprima.parseScript(condition+'');
    if ((parsedCond.body)[0].expression.type=='BinaryExpression' || (parsedCond.body)[0].expression.type=='LogicalExpression')
        parsedCond=binaryCondition(parsedCond);
    if ((parsedCond.body)[0].expression.type=='MemberExpression'){
        for (let [k, v] of globals) {
            parsedCond= memberExpressionCondition((parsedCond.body)[0].expression,k,v);
        }
    }
    else
        parsedCond=IdentifierCondition((parsedCond.body)[0].expression); //if  Identifier

    condition = escodegen.generate(parsedCond); //convert from JSON to string
    return eval(condition); //true or false
}

function binaryCondition(parsedCond){
    var left = (parsedCond.body)[0].expression.left;
    var right = (parsedCond.body)[0].expression.right;

    for (let [k, v] of globals) {
        //replace the condition with the values in the dic
        var newLeft = checkValueType(left,k,v);
        var newRight=checkValueType(right,k,v);
        (parsedCond.body)[0].expression.left=newLeft;
        (parsedCond.body)[0].expression.right=newRight;
    }
    return parsedCond;
}


function IdentifierCondition(parsedCond){
    if (parsedCond.type=='Identifier'){
        for (let [k, v] of globals) {
            parsedCond.name=checkIfString(parsedCond.name);
            if (parsedCond.name==k){
                parsedCond.name = v;
                parsedCond.name=addSlash(parsedCond.name); //if string-> add '/'
            }
        }
    }
    return parsedCond;
}
function memberExpressionCondition(parssedCond,k,v){
    if (parssedCond.object.name==k) {
        parssedCond.object.name = v;
        parssedCond.object.name=checkIfArray(parssedCond.object.name);

    }

    if (parssedCond.property.name!=null) {
        if (parssedCond.property.name==k)
            parssedCond.property.name=v;

    }
    return parssedCond;
}

function checkIfArray(object){
    if (object[0]=='[' && object[object.length-1]==']'){
        let arr=object.substring(1, object.length-1); //remove []
        arr=arr.split(',');
        arr=continueCheckIfarray(arr);
        object='[';
        for (let k=0; k<arr.length ; k++){
            object+=arr[k];
            if (k<arr.length-1)
                object+=',';
        }
        object+=']';
    }
    return object;
}

function continueCheckIfarray(arr){
    for (let i=0; i<arr.length; i++){
        if (checkIfComputed(arr[i])==true){
            let computedValue=arr[i];
            if (globals.has(computedValue.substring(0,computedValue.indexOf('[')))){
                var arrValue=globals.get(computedValue.substring(0,computedValue.indexOf('[')));
                arrValue=arrValue.substring(1, arrValue.length-1); //remove []
                var index=computedValue.substring(computedValue.indexOf('[')+1, computedValue.indexOf(']'));
                if (globals.has(index))
                    index=globals.get(index);
                var array = arrValue.split(',');
                array[index]=checkIfString(array[index]);
                array[index]=addSlash(array[index]); //if string-> add '/'
                arr[i]=array[index];
            }
        }
    }
    return arr;
}


function checkValueType(side, k,v) {
    if (side.type == 'Identifier' ) {
        side.name=checkIfString(side.name);
        if (side.name==k){
            side.name = v;
            side.name=addSlash(side.name); //if string-> add '/'
        }
    }
    if (side.type=='MemberExpression')
        side=memberExpressionCondition(side,k,v);

    if (side.type=='BinaryExpression'){
        checkValueType(side.left,k,v);
        checkValueType(side.right,k,v);
    }

    return side;
}


function addSlash(value){
    value=value.replace(/\s/g, '');

    if (value.includes('"')){
        value=value.replace(new RegExp('"', 'g'), '\'');
    }
    return value;
}

function convertToString(arr){
    var resultCode='';
    for (let i=0; i<arr.length; i++){
        resultCode+=arr[i].Line;
        if (i<arr.length-1)
            resultCode+='\n';
    }
    return resultCode;
}