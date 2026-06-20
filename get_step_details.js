const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: fs.createReadStream('C:\\Users\\CAPTA\\.gemini\\antigravity-ide\\brain\\07f13234-6b37-406c-be92-842b488d9cb8\\.system_generated/logs/transcript.jsonl'),
    output: process.stdout,
    terminal: false
});

rl.on('line', (line) => {
    const step = JSON.parse(line);
    if (step.step_index === 560 || step.step_index === 561 || step.step_index === 707 || step.step_index === 708 || step.step_index === 709) {
        console.log(`Step ${step.step_index}: source=${step.source}, type=${step.type}`);
        if (step.content) {
            console.log('Content snippet:', step.content.substring(0, 1000));
        }
        if (step.tool_calls) {
            console.log('Tool calls:', JSON.stringify(step.tool_calls, null, 2));
        }
    }
});
