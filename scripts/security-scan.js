const { exec } = require('child_process');

function runAudit() {
  exec('npm audit --json', { cwd: __dirname + '/..' }, (error, stdout, stderr) => {
    if (error) {
      console.error('Error running npm audit:', error);
      return;
    }
    try {
      const report = JSON.parse(stdout);
      const vulns = report.metadata?.vulnerabilities || {};
      console.log('=== npm audit summary ===');
      console.log(`Info: ${vulns.info}, Low: ${vulns.low}, Moderate: ${vulns.moderate}, High: ${vulns.high}, Critical: ${vulns.critical}`);
      if (Object.values(vulns).reduce((a,b)=>a+b,0) === 0) {
        console.log('No vulnerabilities found.');
      } else {
        console.log('Details:');
        for (const [name, details] of Object.entries(report.vulnerabilities || {})) {
          console.log(`- ${name}: ${details.severity} – ${details.title}`);
          console.log(`  Introduced via: ${details.from.join(' > ')}`);
        }
      }
    } catch (e) {
      console.error('Failed to parse npm audit output:', e);
    }
  });
}

runAudit();
