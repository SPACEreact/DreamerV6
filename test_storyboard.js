// Quick test to debug storyboard generation
import { generateStoryboard } from './src/services/geminiService.js';

const testScript = `INT. COFFEE SHOP - DAY
A young customer enters and approaches the counter.`;

async function testStoryboard() {
    try {
        console.log('Testing storyboard generation...');
        const result = await generateStoryboard(testScript, 'cinematic', '');
        console.log('Success! Generated storyboard:', result);
    } catch (error) {
        console.error('Storyboard generation failed:', error.message);
        console.error('Full error:', error);
    }
}

testStoryboard();