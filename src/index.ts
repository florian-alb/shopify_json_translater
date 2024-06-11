import * as dotenv from 'dotenv';
import * as deepl from 'deepl-node';
import {TargetLanguageCode} from 'deepl-node';
import * as fs from 'fs/promises';
import * as path from 'path';
import {DOMParser} from 'xmldom';

dotenv.config();

const authKey = "0303429a-f470-93e7-ef1c-0147a61cb4d3:fx"
const fieldsToTranslate = ["text", "title", "link_text", "content", "subheading","text_before", "text_after", "support_hours", "answer_time"];
const inputFilePath = path.join(__dirname, 'toTranslate.json');
const outputFilePath = path.join(__dirname, 'translated.json');
const targetLanguage: TargetLanguageCode = "en-US"

function isValidHTML(htmlString: string): boolean {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return true
}

function correctHTML(htmlString: string) : string {
    // Step 1: Try to parse the string
    if (isValidHTML(htmlString)) {
        return htmlString; // If already valid, return as is
    }

    // Step 2: Attempt to auto-correct common issues
    // Example: Fix unclosed tags, misplaced characters, etc.
    let correctedHtml = htmlString;

    // Add missing closing tags
    const tagsToClose : string[] = [];
    correctedHtml = correctedHtml.replace(/<([^\/>]+)>/g, (match, tagName) => {
        tagsToClose.push(tagName);
        return match;
    });

    correctedHtml = correctedHtml.replace(/<\/([^>]+)>/g, (match, tagName) => {
        const index = tagsToClose.lastIndexOf(tagName);
        if (index > -1) {
            tagsToClose.splice(index, 1);
            return match;
        }
        return '';
    });

    tagsToClose.reverse().forEach(tag => {
        correctedHtml += `</${tag}>`;
    });

    // Remove misplaced characters (e.g., a period at the end of a closing tag)
    correctedHtml = correctedHtml.replace(/<\/[^>]+>\./g, match => match.slice(0, -1));

    // Step 3: Re-validate the corrected HTML
    if (isValidHTML(correctedHtml)) {
        return correctedHtml;
    }

    // Step 4: If still invalid, return an error message or handle accordingly
    return `${htmlString} ⚠️Incorrect⚠️`;
}

async function translateText(text: string) {
    const translator = new deepl.Translator(authKey);
    console.log(`🌍 Translating "${text}"  to ${targetLanguage}`);
    return translator.translateText(text, null, targetLanguage)
        .then((result) => {
            return result.text
        })
        .catch((error) => {
            console.error(error);
        });
}

async function traverseAndTranslate(obj: any): Promise<void> {
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && fieldsToTranslate.includes(key) && value !== "") {
            let translated = await translateText(value);

            // if (key === "content" && translated) {
            //     if (!isValidHTML(translated)) {
            //         translated = correctHTML(translated);
            //     }
            // }

            console.log("🫵 translated :", translated);
            obj[key] = translated;
        } else if (typeof value === "object" && value !== null) {
            await traverseAndTranslate(value);
        }
    }
    return obj
}

async function main() {
    try {
        const data = await fs.readFile(inputFilePath, 'utf8');

        const json = JSON.parse(data);

        const translatedJSON = await traverseAndTranslate(json)
        await fs.writeFile(outputFilePath, JSON.stringify(translatedJSON, null, 2));
        console.log(`Translation completed. Translated file saved to ${outputFilePath}`);
    } catch (error) {
        console.error('Error:', error);
    }
}
main().catch(console.error);