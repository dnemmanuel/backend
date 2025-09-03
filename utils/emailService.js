// src/services/emailService.js
import { spawn } from 'child_process';
import path from 'path';

/**
 * Sends an email by executing a PowerShell script.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject line of the email.
 * @param {string} html - The HTML content for the email body.
 */
export const sendEmail = (to, subject, html) => {
    return new Promise((resolve, reject) => {
        // Construct the full path to the PowerShell script.
        // It's assumed the script is in a 'scripts' folder one level up from 'src/services'.
        const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'send-email.ps1');

        // Arguments to pass to the PowerShell script
        // '-ExecutionPolicy Bypass' is necessary to allow script execution
        // without changing the server's overall policy.
        const args = [
            'powershell.exe',
            '-ExecutionPolicy', 'Bypass',
            '-File', scriptPath,
            '-to', to,
            '-subject', subject,
            '-html', html
        ];

        // Spawn the PowerShell process.
        // On Windows, the command is 'powershell.exe'.
        const ps = spawn('powershell.exe', args);

        ps.stdout.on('data', (data) => {
            console.log(`PowerShell Stdout: ${data}`);
        });

        ps.stderr.on('data', (data) => {
            console.error(`PowerShell Stderr: ${data}`);
        });

        ps.on('close', (code) => {
            if (code === 0) {
                console.log(`Email script exited with success code ${code}.`);
                resolve();
            } else {
                console.error(`Email script exited with error code ${code}.`);
                reject(new Error(`Failed to send email. Script exited with code ${code}.`));
            }
        });

        // Handle errors during the spawning of the process itself
        ps.on('error', (err) => {
            console.error('Failed to start PowerShell process:', err);
            reject(err);
        });
    });
};
