
const pdf = require('pdf-extraction');

export interface ExtractedPdfData {
    firstName?: string;
    lastName?: string;
    folderRef?: string;
    patientPhone?: string;
    dob?: Date;
}

export class PdfExtractorUtil {
    /**
     * Extracts patient information from PDF buffer
     */
    static async extractData(buffer: Buffer): Promise<ExtractedPdfData> {
        try {
            const data = await pdf(buffer);
            const text = data.text;
            console.log('[PdfExtractorUtil] Raw text:', text.substring(0, 500));

            const result: ExtractedPdfData = {
                firstName: this.detectFirstName(text),
                lastName: this.detectLastName(text),
                folderRef: this.detectFolderRef(text),
                patientPhone: this.detectPhone(text),
                dob: this.detectDob(text)
            };

            // Heuristic fallback if no labels found
            if (!result.lastName || !result.folderRef) {
                const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 2);

                // Usually the name is one of the first few lines, after a title
                const commonTitles = ['RELEVÉ DE NOTES', 'RELEVÉ', 'BULLETIN', 'RESULTATS', 'RAPPORT', 'COMPTE-RENDU'];
                let startIndex = 0;
                if (lines[0] && commonTitles.some(t => lines[0].toUpperCase().includes(t))) {
                    startIndex = 1;
                }

                if (!result.lastName && lines[startIndex]) {
                    const nameCandidate = lines[startIndex];
                    // Check if it looks like a name (not just numbers)
                    if (/[a-zA-ZÀ-Ÿ]/.test(nameCandidate) && nameCandidate.split(' ').length >= 2) {
                        const parts = nameCandidate.split(' ');
                        result.lastName = parts[0];
                        result.firstName = parts.slice(1).join(' ');
                    }
                }

                if (!result.folderRef && lines[startIndex + 1]) {
                    const refCandidate = lines[startIndex + 1];
                    // Check if it looks like a code (alphanumeric, no spaces or few spaces)
                    if (/^[A-Z0-9-]{5,15}$/i.test(refCandidate.replace(/\s/g, ''))) {
                        result.folderRef = refCandidate.replace(/\s/g, '');
                    }
                }
            }

            return result;
        } catch (error) {
            console.error('[PdfExtractorUtil] Error extracting PDF data:', error);
            return {};
        }
    }

    private static detectLastName(text: string): string | undefined {
        // Liste de mots-clés à exclure (Personnel du labo)
        const staffKeywords = ['Major', 'Biologiste', 'Chef', 'Vice', 'Médecin'];

        // On cherche le Code Patient pour se situer
        const codePos = text.toLowerCase().indexOf('code patient');
        let contextText = text;

        // Si on trouve le code, on regarde surtout la zone autour (le rectangle)
        if (codePos !== -1) {
            contextText = text.substring(Math.max(0, codePos - 300), Math.min(text.length, codePos + 100));
        }

        const patterns = [
            /NOM\s*[:\-]\s*([A-ZÀ-Ÿ\s\-]{2,})/i,
            /Patient\s*[:\-]\s*([A-ZÀ-Ÿ\s\-]{2,})/i,
            /(?:Mme|Mr|M\.)\s+([A-ZÀ-Ÿ\s\-]{2,})/gi
        ];

        for (const p of patterns) {
            let match;
            while ((match = p.exec(contextText)) !== null) {
                const fullMatch = match[0];
                const captured = match[1].trim();

                // Vérification : est-ce que cette ligne contient un mot-clé de staff juste avant ?
                const lineStart = contextText.lastIndexOf('\n', match.index) + 1;
                const prefix = contextText.substring(lineStart, match.index);

                if (staffKeywords.some(k => prefix.toLowerCase().includes(k.toLowerCase()))) {
                    continue; // C'est un Major, un Médecin, etc. On saute.
                }

                const clean = captured.replace(/\s+/g, ' ');
                return clean.split(' ')[0];
            }
        }
        return undefined;
    }

    private static detectFirstName(text: string): string | undefined {
        const staffKeywords = ['Major', 'Biologiste', 'Chef', 'Vice', 'Médecin'];
        const codePos = text.toLowerCase().indexOf('code patient');
        let contextText = text;
        if (codePos !== -1) {
            contextText = text.substring(Math.max(0, codePos - 300), Math.min(text.length, codePos + 100));
        }

        const patterns = [
            /PR[ÉE]NOM\s*[:\-]\s*([A-ZÀ-Ÿ\s[a-zà-ÿ\-]+)/i,
            /Patient\s*[:\-]\s*[A-ZÀ-Ÿ\-]+\s+([A-ZÀ-Ÿ[a-zà-ÿ\s\-]+)/i,
            /(?:Mme|Mr|M\.)\s+[A-ZÀ-Ÿ\-]+\s+([A-ZÀ-Ÿ\s\-]+?)(?:\r?\n|$)/gi
        ];

        for (const p of patterns) {
            let match;
            while ((match = p.exec(contextText)) !== null) {
                const captured = match[1].trim();
                const lineStart = contextText.lastIndexOf('\n', match.index) + 1;
                const prefix = contextText.substring(lineStart, match.index);

                if (staffKeywords.some(k => prefix.toLowerCase().includes(k.toLowerCase()))) {
                    continue;
                }

                return captured.replace(/\s+/g, ' ');
            }
        }
        return undefined;
    }

    private static detectFolderRef(text: string): string | undefined {
        const patterns = [
            /Code\s+Patient\s*[:\-]?\s*(\d{5,})/i,
            /CODE PATIENT\s*[:\-]\s*([A-Z0-9\-]{4,})/i,
            /Référence\s*[:\-]\s*(\d{5,})/i, // Support de l'autre étiquette à gauche au cas où
            /DOSSIER\s*[:\-]\s*([A-Z0-9\-]{4,})/i
        ];
        for (const p of patterns) {
            const match = text.match(p);
            if (match) return match[1].trim();
        }
        return undefined;
    }

    private static detectPhone(text: string): string | undefined {
        const patterns = [
            /\+237\s?([6][5-9]\d{7})/,
            /237\s?([6][5-9]\d{7})/,
            /\b([6][5-9]\d{7})\b/
        ];
        for (const p of patterns) {
            const match = text.match(p);
            if (match) {
                let phone = match[0].replace(/\s/g, '');
                if (!phone.startsWith('+')) {
                    phone = (phone.startsWith('237')) ? '+' + phone : '+237' + phone;
                }
                return phone;
            }
        }
        return undefined;
    }

    private static detectDob(text: string): Date | undefined {
        const patterns = [
            /N[ée](?:e)?\s+(?:le)?\s*[:.]?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
            /Date\s+de\s+naissance\s*[:.]?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i
        ];
        for (const p of patterns) {
            const match = text.match(p);
            if (match) {
                try {
                    const dateStr = match[1].replace(/[\/\.]/g, '-');
                    const [d, m, y] = dateStr.split('-');
                    return new Date(`${y}-${m}-${d}`);
                } catch (e) {
                    return undefined;
                }
            }
        }
        return undefined;
    }
}
