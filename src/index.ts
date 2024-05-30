import * as dotenv from 'dotenv';
import * as deepl from 'deepl-node';
import * as fs from 'fs/promises';
import * as path from 'path';
import {SourceLanguageCode, TargetLanguageCode} from "deepl-node";

dotenv.config();

const authKey = "0303429a-f470-93e7-ef1c-0147a61cb4d3:fx"
const fieldsToTranslate = ["text", "title", "link_text", "content", "subheading","text_before", "text_after", "support_hours", "answer_time"];
const inputFilePath = path.join(__dirname, 'toTranslate.json');
const outputFilePath = path.join(__dirname, 'translated.json');
const targetLanguage: TargetLanguageCode = "en-US"

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
            const translated = await translateText(value);
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