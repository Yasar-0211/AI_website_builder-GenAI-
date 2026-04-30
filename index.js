import { GoogleGenAI } from "@google/genai";
import readlineSync from 'readline-sync';
import { exec } from "child_process";
import { promisify } from "util";
import os from 'os';

const platform = os.platform();
const asyncExecute = promisify(exec);

const History = [];
const ai = new GoogleGenAI({ apiKey: "Your API KEY" });



// Tool to execute commands in terminal

async function executeCommand({command}){
    try{
    const {stdout, stderr} = await asyncExecute(command);

    if(stderr){
        return `Error: ${stderr}`
    }
    return `Success ${stdout} || Task executed completely`
    }
    catch(error){
        return `Error: ${error}`
    }
    
}

const executeCommandDeclaration = {
    name: 'executeCommand',
    description:"execute a single terminal/shell command. A command can be to create a folder, file, write on a file, delete a file/folder.",
    parameters:{
        type:'OBJECT',
        properties:{
            command:{
                type:'STRING',
                description: 'It will be a single terminal command. example:"mkdir calculator"'
            },
        },
        required: ['command']   
    }
}


const availableTools = {
    executeCommand: executeCommand,
}



async function runAgent(userProblem) {

    History.push({
        role:'user',
        parts:[{text:userProblem}]
    });

   
    while(true){
    
   const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: History,
    config: {
        systemInstruction: `You are an Website Builder expert. You have to create the frontend as per the 
        user input. 
        You have access to the tools which can run or execute any shell or terminal command.
        Current user operating system is: ${platform}
        Give command to the user according to it's operating system support.

        <-- What is your job -->
        1. Analyse the user query to see what type of website they want to build.
        2. Give them command one by one, step by step,
        3. Use available tool executeCommand

        Now you can give them command in the way written below:
        1: First check the OS.
        2: Create a folder, Ex: mkdir "calculator"
        3: Inside the folder, create index.html Ex: touch "calculator/index.html"
        4: Inside the folder, create style.css ... same as above
        5: Inside the folder, create script.js
        6: Code all these files as per requirement

        You have to provide the terminal or shell command to user, they will directly execute it
        `,
    tools: [{
      functionDeclarations: [executeCommandDeclaration]
    }],
    },
   });


   if(response.functionCalls&&response.functionCalls.length>0){
    
    console.log(response.functionCalls[0]);
    const {name,args} = response.functionCalls[0];

    const funCall =  availableTools[name];
    const result = await funCall(args);

    const functionResponsePart = {
      name: name,
      response: {
        result: result,
      },
    };
   
    // model 
    History.push({
      role: "model",
      parts: [
        {
          functionCall: response.functionCalls[0],
        },
      ],
    });

    // result Ko history daalna

    History.push({
      role: "user",
      parts: [
        {
          functionResponse: functionResponsePart,
        },
      ],
    });
   }
   else{

    History.push({
        role:'model',
        parts:[{text:response.text}]
    })
    console.log(response.text);
    break;
   }


  }




}


async function main() {
    console.log("I am website builder designed by Mazin what you wanna build.");
    const userProblem = readlineSync.question("Ask me anything--> ");
    await runAgent(userProblem);
    main();
}


main();





