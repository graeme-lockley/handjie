import { Tool } from "./types.ts";

class Calculator extends Tool {
  name = "Calculator";
  identifier = "calculator";
  abilities = ["Perform basic arithmetic operations"];
  instructions = [
    "You can use the calculator to perform basic arithmetic operations.",
    "The calculator can handle addition, subtraction, multiplication, and division.",
    "You can also use parentheses to group operations.",
  ];
  functions = [
    {
      name: "calculate",
      purpose: "Perform a calculation",
      arguments: [
        {
          name: "expression",
          description:
            "JavaScript expression to evaluate, for example: (20 + 2) / 7",
          dataType: "string",
        },
      ],
      response: "The result of the calculation",
    },
  ];

  functionMap = {
    calculate: this.evaluate.bind(this),
  };

  async evaluate(expression: string) {
    const result = eval(expression);

    console.log(
      `Tool:calculator.calculate: (expression = ${expression}) -> ${result}`,
    );

    return result;
  }
}

export const calculator = new Calculator();
