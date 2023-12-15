const { execSync } = require('child_process');
const https = require('https');

const openAIKey = process.env.OPENAI_API_KEY;

async function getGitStatus() {
    try {
        const status = execSync('git status --porcelain').toString();
        const lines = status.trim().split('\n');
        const changes = lines.map(line => {
            const [type, file] = line.split(' ').filter(Boolean);
            return { type, file };
        });
        return changes;
    } catch (error) {
        throw new Error('Error fetching Git status: ' + error.message);
    }
}

async function generateCommitMessage() {
    const changes = await getGitStatus();
    if (changes.length === 0) {
        return 'No changes to commit.';
    }

    const changeSummary = changes.map(({ type, file }) => `${type} ${file}`).join('\n');
    const content = `Based on the following Git status, generate a commit message compatible with semantic release:\n\n${changeSummary}`;

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            "messages": [{ "role": "user", content }],
            model: "gpt-3.5-turbo",
            max_tokens: 256,
            temperature: 0.7,
            top_p: 1,
        });

        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length,
                'Authorization': `Bearer ${openAIKey}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.choices && response.choices.length > 0 && response.choices[0].message) {
                        resolve(response.choices[0].message.content.trim());
                    } else {
                        reject('Invalid response format: ' + data);
                    }
                } catch (error) {
                    reject('Error parsing response data: ' + error.message);
                }
            });
        });

        req.on('error', (error) => {
            reject('Error in HTTP request: ' + error.message);
        });

        req.write(postData);
        req.end();
    });
}

async function commitAndPush() {
    try {
        execSync('git add -A');
        const commitMessage = await generateCommitMessage();
        if (commitMessage && commitMessage !== 'No changes to commit.') {
            execSync(`git commit -m "${commitMessage}"`);
            execSync('git push');
            console.log('Changes committed and pushed successfully.');
        } else {
            console.log(commitMessage);
        }
    } catch (error) {
        console.error('An error occurred:', error.message);
    }
}

commitAndPush();
