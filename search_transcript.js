const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: fs.createReadStream('C:\\Users\\CAPTA\\.gemini\\antigravity-ide\\brain\\07f13234-6b37-406c-be92-842b488d9cb8\\.system_generated/logs/transcript.jsonl'),
    output: process.stdout,
    terminal: false
});

rl.on('line', (line) => {
    const step = JSON.parse(line);
    if (step.tool_calls) {
        step.tool_calls.forEach(call => {
            if (call.name === 'write_to_file' || call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
                const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
                const content = args.CodeContent || args.ReplacementContent || '';
                if (content.includes('unsplash') || content.includes('photo-')) {
                    console.log(`Step ${step.step_index} (${call.name}) to ${args.TargetFile} contains unsplash URL:`);
                    const matches = content.match(/https:\/\/images\.unsplash\.com\/[^\s'"`]+/g);
                    if (matches) {
                        matches.forEach(m => console.log('  ', m));
                    }
                }
            }
        });
    }
});
