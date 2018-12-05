import * as esprima from 'esprima';

var result=[];
const parseCode = (codeToParse) => {
    if (codeToParse.length==0 || codeToParse==''){ //empty input
        return [];
    }
    else {
        result = [];
        let parsedCode = esprima.parseScript(codeToParse, {loc: true});
        result = startBuildingTable(parsedCode);
        return result;
    }
};

export {parseCode};

const statementType = {
    'VariableDeclaration' : decStatement,
    'ExpressionStatement' : assStatement,
    'ReturnStatement' : returnStatement,
    'WhileStatement' : whileStatement,
    'IfStatement' : ifstatement,
    'ForStatement' : forStatement,
    'AssignmentExpression' : assStatement,
    'UpdateExpression' : assStatement,
    'Program' : headerLines
};

function startBuildingTable(parsedCode){
    if ((parsedCode.body)[0].type=='FunctionDeclaration') { //function declaration
        headerLines(parsedCode);
        bodyLines((parsedCode.body)[0].body.body);
    }
    else{
        bodyLines(parsedCode.body);
    }
    return result;
}

function parseData(data){
    return statementType[data.type](data);
}

//find value of string
function valueReturn(statement) {
    var value='';
    if (statement.type=='Literal' || statement.type=='Identifier'){ //SINGLE VALUE
        if (statement.name!=null) //var
            value = statement.name;
        if (statement.value!=null) //number
            value = statement.value;
    }
    else{
        value=longValue(statement);
    }
    return value;
}

//find value of binary expressions or unary expressions ( seperated because function would be too complicated)
function longValue(statement) {
    let value = '';
    let res = '';
    if (statement.type == 'BinaryExpression') {//binary expression (NOT a single value)
        value = binaryExpression(statement.operator, statement.left, statement.right);
    }
    else  if (statement.type=='UnaryExpression'){ //unary expression
        if (statement.argument.name != null) { //var
            res = statement.argument.name;
        }
        if (statement.argument.value != null) { //number
            res = statement.argument.value;
        }
        let operator = statement.operator;
        value = operator + '' + res;
    }
    else
        value = memberExpressionValue(statement); //memeber expression value
    return value;
}

//find value of ComputedMemberExpression
function memberExpressionValue(statement){
    if (statement.type!='LogicalExpression') { //member expression value;
        let value = '';
        if (statement.property.name != null)
            value = statement.object.name + '[' + statement.property.name + ']';
        else if (statement.property.value != null)
            value = statement.object.name + '[' + statement.property.value + ']';
        else
            value = statement.object.name + '[' + (valueReturn(statement.property)) + ']';
        return value;
    }
    else{
        return LogicalExpression(statement);
    }
}

function LogicalExpression(statement){
    return valueReturn(statement.left)+statement.operator+valueReturn(statement.right);
}
//function decleration
function headerLines(parsedCode){
    let name=(parsedCode.body)[0].id.name;

    //put the header of the function in the table:
    insertIntoResult(parsedCode,(parsedCode.body)[0].type, name, '', '');
    //put the function's params in the table:
    var params_amount=(parsedCode.body)[0].params.length;

    for (let i=0; i<params_amount ; i++){
        let name=(parsedCode.body)[0].params[i].name;
        insertIntoResult(parsedCode,'variable declaration', name, '', '');
    }
}

//handle binary expression
function binaryExpression(operator, left, right) {
    let newLeft='';
    let newRight='';

    if (left.type == 'BinaryExpression') {
        newLeft = '('+binaryExpression(left.operator,left.left,left.right)+')';
    }
    else{
        newLeft=getLeftExp(left);
    }

    if (right.type == 'BinaryExpression')
        newRight = '(' + binaryExpression(right.operator,right.left,right.right) + ')';
    else {
        newRight = getRightExp(right);
    }
    return (newLeft+' '+operator+' '+newRight);
}
function getLeftExp(left) {
    let newLeft = '';
    if (left.name != null)
        newLeft = left.name;
    if (left.value != null)
        newLeft = left.value;
    if (left.type == 'MemberExpression') {
        newLeft=checkLeftProperty(left);
    }
    return newLeft;
}

function checkLeftProperty(left){
    let newLeft='';
    if (left.property.name != null)
        newLeft = left.object.name + '[' + left.property.name + ']';
    else if (left.property.value != null)
        newLeft = left.object.name + '[' + left.property.value + ']';
    else
        newLeft = left.object.name + '[' +(valueReturn(left.property))+ ']';
    return newLeft;
}
function getRightExp(right) {
    let newRight = '';
    if (right.name != null)
        newRight = right.name;
    if (right.value != null)
        newRight = right.value;
    if (right.type == 'MemberExpression') {
        newRight=checkRightProperty(right);
    }
    return newRight;
}

function checkRightProperty(right){
    let newRight='';
    if (right.property.name != null)
        newRight = right.object.name + '[' + right.property.name + ']';
    else if (right.property.value != null)
        newRight = right.object.name + '[' + right.property.value + ']';
    else
        newRight = right.object.name + '[' +(valueReturn(right.property))+ ']';
    return newRight;
}

function bodyLines(statement)
{
    let body=statement;
    let num_statements = body.length;
    if (num_statements!=null) {
        for (let i = 0; i < num_statements; i++) {
            checkStatement(body[i]);
        }
    }
    else{
        checkStatement(body);
    }
}

//checks the type of the given statement and convert it into lines
function checkStatement(body){
    parseData(body);
}

//decleration statements
function decStatement(statements){ //can be several decleration statement in the same row
    let num_statements = statements.declarations.length;
    for (let i =0; i<num_statements ; i++){
        let statement = (statements.declarations)[i];
        var varValue;
        if (statement.init!=null){
            varValue = valueReturn(statement.init);
            insertIntoResult(statement,'variable declaration', statement.id.name, '', varValue);

        }
        else{
            insertIntoResult(statement,'variable declaration', statement.id.name, '',  'null(or nothing)');
        }
    }
}

function assStatement(statement){
    if (statement.expression.type=='AssignmentExpression') {//asisgnment statement
        let name = valueReturn(statement.expression.left);
        let value = valueReturn(statement.expression.right);
        insertIntoResult(statement,'assignment expression', name, '', value);
    }
    if (statement.expression.type=='UpdateExpression'){
        let name = statement.expression.argument.name;
        let operator=IncreaseOrDecrease(statement.expression.operator);
        let value =  name+''+operator+'1';
        insertIntoResult(statement,'update expression', name, '', value);
    }
}

//check if ++ or --
function IncreaseOrDecrease(operator){
    if (operator== '++'){
        return '+';
    }
    return '-';
}

function whileStatement(statement){
    var condition;
    condition=valueReturn(statement.test);
    insertIntoResult(statement,'while statement', '', condition,'');
    //IF THERE ARE MORE STATEMENTS INSIDE THE WHILE:
    bodyLines(statement.body.body);
}

//if statements
function ifstatement(statement) {
    //header(condition)
    let condition = valueReturn(statement.test);
    insertIntoResult(statement,'if statement', '', condition,'');
    //IF THERE ARE MORE STATEMENTS INSIDE THE IF:
    if (statement.consequent.body != null) { //if there's more than one line in the for
        bodyLines(statement.consequent.body);
    }
    else { //one line in the for
        bodyLines(statement.consequent);
    }
    if (statement.alternate!=null){
        ifAlternates(statement);
    }
}

//if's alternates ("else" or "else if")
function ifAlternates(statement){
    while (statement.alternate!=null && statement.alternate.type=='IfStatement'){
        elseIfHeader(statement.alternate);
        elseIfBody(statement.alternate);
        statement=statement.alternate;
    }
    //IF THERE'S  else:
    if (statement.alternate.body!=null){
        bodyLines(statement.alternate.body);
    }
    else{
        bodyLines(statement.alternate);
    }
}

//else if body
function elseIfBody(statement){
    if (statement.consequent.body != null) { //if there's more than one line in the for
        bodyLines(statement.consequent.body);
    }
    else { //one line in the for
        bodyLines(statement.consequent);
    }
}
function returnStatement(statement){
    var res;
    res=valueReturn(statement.argument);
    insertIntoResult(statement,'return statement', '', '',res);
}

//else if header (condition)
function elseIfHeader(statement) {
    var condition =valueReturn(statement.test);
    insertIntoResult(statement,'else if statement', '', condition,'');
}

function forStatement(statement){
    var init='';
    var action='';
    if (statement.init.type=='AssignmentExpression')
        init =valueReturn(statement.init.left)+' '+ statement.init.operator+' '+valueReturn(statement.init.right);
    else{ //"VariableDeclarator"
        let x = (statement.init.declarations)[0];
        init = x.id.name+'='+valueReturn(x.init);
    }
    let cond = valueReturn(statement.test);
    action = forStatementAction(statement);
    insertIntoResult(statement,'for statement', '', init+';'+cond+';'+action,'');
    bodyLines(statement.body.body);
}

function forStatementAction(statement){
    if (statement.update.type=='UpdateExpression'){
        let name = statement.update.argument.name;
        let operator=statement.update.operator;
        return (name+''+operator);
    }
    else { //assignment expression
        let name = valueReturn(statement.update.left);
        let value = valueReturn(statement.update.right);
        return (name+'='+value);
    }
}
function insertIntoResult(parsedCode,Type,Name, Condition, Value ){
    result.push({'Line':parsedCode.loc.start.line, 'Type' :Type, 'Name': Name, 'Condition': Condition, 'Value':Value});
}