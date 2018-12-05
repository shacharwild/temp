import assert from 'assert';
import {parseCode} from '../src/js/code-analyzer';
//import {describe} from 'nyc';
//import {startBuildingTable} from '../src/js/code-analyzer';

//check output table
describe('1', () => {
    it('is parsing "no lines" code(input) correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('')),
            '[]'
        );//
    });
    it('is parsing a short variable declaration correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('let a = 1;')),
            '[{"Line":1,"Type":"variable declaration","Name":"a","Condition":"","Value":'+1+'}]'
        );
    });
});
describe('2', () => {
    it('is parsing a varaible declaration statement (with no initializatio) correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('var x;')),
            '[{"Line":1,"Type":"variable declaration","Name":"x","Condition":"","Value":"null(or nothing)"}]'
        );
    });
    it('is parsing a function decleration correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('function binarySearch(X){}')),
            '[{"Line":1,"Type":"FunctionDeclaration","Name":"binarySearch","Condition":"","Value":""},' +
            '{"Line":1,"Type":"variable declaration","Name":"X","Condition":"","Value":""}]'
        );
    });
});
describe('3', () => {
    it('is parsing an assignment expression  correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('x= y+5;')),
            '[{"Line":1,"Type":"assignment expression","Name":"x","Condition":"","Value":"y + 5"}]'
        );
    });
    it('is parsing a while statement  correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('while(x==sora[layla]){sora[3]=ken;}')),
            '[{"Line":1,"Type":"while statement","Name":"","Condition":"x == sora[layla]","Value":""},' +
            '{"Line":1,"Type":"assignment expression","Name":"sora[3]","Condition":"","Value":"ken"}]'
        );
    });
});
describe('4', () => {
    it('is parsing a for statement (with assignment expression init) correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('for (i=0; i<5;i=i+1){}')),
            '[{"Line":1,"Type":"for statement","Name":"","Condition":"i = 0;i < 5;i=i + 1","Value":""}]'
        );
    });
    it('is parsing a return statement (returns number) correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('function func(){\n' +
                'return -5;\n' +
                '}')),
            '[{"Line":1,"Type":"FunctionDeclaration","Name":"func","Condition":"","Value":""},' +
            '{"Line":2,"Type":"return statement","Name":"","Condition":"","Value":"-5"}]'
        );
    });
});
describe('5', () => {
    it('is parsing an updating expression correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('i++;')),
            '[{"Line":1,"Type":"update expression","Name":"i","Condition":"","Value":"i+1"}]'
        );
    });
});
describe('6', () => {
    it('is parsing a "if" and "else if" and "else" expression correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('if (x<5)\n' +
                'y=(5+x)+2\n' +
                'else if (x>=5)\n' +
                'y=2+(5+x);\n' +
                'else\n' +
                'y--;')),
            '[{"Line":1,"Type":"if statement","Name":"","Condition":"x < 5","Value":""},' +
            '{"Line":2,"Type":"assignment expression","Name":"y","Condition":"","Value":"(5 + x) + 2"},' +
            '{"Line":3,"Type":"else if statement","Name":"","Condition":"x >= 5","Value":""},' +
            '{"Line":4,"Type":"assignment expression","Name":"y","Condition":"","Value":"2 + (5 + x)"},' +
            '{"Line":6,"Type":"update expression","Name":"y","Condition":"","Value":"y-1"}]'
        );
    });
});
describe('7', () => {
    it('is parsing a member Expression with a var value', () => {
        assert.equal(
            JSON.stringify(parseCode('let a=sora[x];')),
            '[{"Line":1,"Type":"variable declaration","Name":"a","Condition":"","Value":"sora[x]"}]'
        );
    });
    it('is parsing a member Expression with a binary expression value', () => {
        assert.equal(
            JSON.stringify(parseCode('let a=sora[x+y];')),
            '[{"Line":1,"Type":"variable declaration","Name":"a","Condition":"","Value":"sora[x + y]"}]'
        );
    });

});
describe('8', () => {
    it('is parsing a return statement (returns variable) correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('function func(){\n' +
                'return -x;\n' +
                '}')),
            '[{"Line":1,"Type":"FunctionDeclaration","Name":"func","Condition":"","Value":""},' +
            '{"Line":2,"Type":"return statement","Name":"","Condition":"","Value":"-x"}]'
        );
    });
    it('is parsing first complicated assignment expression correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('x=(x[5+x]+x[5+3])+(x[y+x])+(x[5]);')),
            '[{"Line":1,"Type":"assignment expression","Name":"x","Condition":"","Value":"((x[5 + x] + x[5 + 3]) + x[y + x]) + x[5]"}]'
        );
    });
});
describe('9', () => {
    it('is parsing second complicated assignment expression correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('for (let i=0; i<5 && i>6; i++){\n' +
                'x=x[y]+(x[5]+x[y+5]);\n' +
                '}')),
            '[{"Line":1,"Type":"for statement","Name":"","Condition":"i=0;i < 5&&i > 6;i++","Value":""},' +
            '{"Line":2,"Type":"assignment expression","Name":"x","Condition":"","Value":"x[y] + (x[5] + x[y + 5])"}]'
        );
    });
});
describe('10', () => {
    it('is parsing a "if" and "else if" and "else" expressions (with more than one statement in each)  correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('if (x<5){\n' +
                'y=x;\n' +'y=sora;\n' +'}\n' +'else if (x>=5){\n' + 'y=x;\n' +'y=layla;\n' +
                '}\n' +
                'else{\n' +
                'x=sora;\n' +
                'x=layla;\n' +
                '}')),
            '[{"Line":1,"Type":"if statement","Name":"","Condition":"x < 5","Value":""},' +
            '{"Line":2,"Type":"assignment expression","Name":"y","Condition":"","Value":"x"},' +
            '{"Line":3,"Type":"assignment expression","Name":"y","Condition":"","Value":"sora"},' +
            '{"Line":5,"Type":"else if statement","Name":"","Condition":"x >= 5","Value":""},' +
            '{"Line":6,"Type":"assignment expression","Name":"y","Condition":"","Value":"x"},' +
            '{"Line":7,"Type":"assignment expression","Name":"y","Condition":"","Value":"layla"},' +
            '{"Line":10,"Type":"assignment expression","Name":"x","Condition":"","Value":"sora"},' +
            '{"Line":11,"Type":"assignment expression","Name":"x","Condition":"","Value":"layla"}]'
        );});});

describe('11', () => {
    it('is parsing an if (without "else if" and "else") statement correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('if (x==5){}')),
            '[{"Line":1,"Type":"if statement","Name":"","Condition":"x == 5","Value":""}]'
        );
    });

});

