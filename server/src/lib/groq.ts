import Groq from "groq-sdk";
import {env} from '../env'

// Initialize the Groq client
export const groq = new Groq({ apiKey: env.groqApiKey });
