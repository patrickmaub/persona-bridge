export enum Opcode {
    PUSH = "push",
    POP = "pop",
    ADD = "add",
    SUB = "sub",
    MUL = "mul",
    DIV = "div",
    LT = "lt",
    GT = "gt",
    LTE = "lte",
    GTE = "gte",
    EQ = "eq",
    GTEQ = "gteq",
    NEQ = "neq",
    AND = "and",
    OR = "or",
    NOT = "not",
    JUMP = "jump",
    JUMPF = "jumpf",
    JUMPT = "jumpt",
    JUMPTF = "jumptf",
    LOAD = "load",
    STORE = "store",
    CALL = "call",
    RET = "ret",
    HALT = "halt",
    PRINT = "print",
    INPUT = "input",
    SYSCALL = "syscall",
    DATA = "data",
    INC = "inc",
    DEC = "dec",
    NEG = "neg",
    COPY = "copy",
    SETGL = "setgl",
    DECLAREGL = "declaregl",
    LOADGL = "loadgl",
    NATIVE = "native",
    NOP = "nop",
    MOD = "MOD",
    MAKE_TUPLE = "make_tuple",
    MAKE_LIST = "make_list",
    MAKE_DICT = "make_dict",
    SUBSCRIPT = "subscript",
    STORE_SUBSCRIPT = "store_subscript",
    MEMBER_ACCESS = "member_access",
    POW = "POW"
}

export class Instruction {
    type: Opcode;
    lineNumber: number;
    value?: number;

    constructor(type: Opcode, lineNumber: number, value?: number) {
        this.type = type;
        this.lineNumber = lineNumber;
        this.value = value;
    }
}
