
const PDFDocument = require('pdfkit');
const fs = require('fs');

async function generateTestPDF() {
    // On change le nom et le code pour être SÛR que c'est un nouveau test
    const filePath = '/Users/emmanuel/Documents/Medlabs/Incomings/TEST_HGD_VALIDATION.pdf';
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Titre
    doc.fontSize(16).text('LABORATOIRE DE BIOLOGIE CLINIQUE', { align: 'center' });
    doc.fontSize(12).text('CLINICAL BIOLOGY LABORATORY', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).text('Chef de Service : Pr NGOUADJEU Eveline', { align: 'center' });
    doc.text('Biologistes : Dr OLEMBA Clémentine - Dr MIAFFO Caroline', { align: 'center' });
    doc.moveDown(2);

    // Ligne de gauche (à ignorer)
    doc.text('Prélèvement du : 28-01-2026', 50, 200);
    doc.text('Référence : 999888777', 50, 215);
    doc.text('Edition : 28-01-2026', 50, 230);

    // LE RECTANGLE (CIBLE)
    // On utilise un Code Patient UNIQUE pour ce test
    const uniqueCode = "2026012899";

    doc.rect(250, 190, 250, 70).stroke();
    doc.fontSize(11).text('Mme MANEDIEU JULIENNE', 260, 200);
    doc.text(`Code Patient ${uniqueCode}`, 260, 220);
    doc.text('Médecin Dr IKOME GISHLEN', 260, 240);

    doc.moveDown(5);
    doc.fontSize(12).text('BIOCHIMIE SANGUINE GÉNÉRALE ET SPÉCIALISÉE', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text('RESULTATS : TOUT EST NORMAL');

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => {
            console.log(`✅ PDF de validation généré : ${filePath}`);
            console.log(`👤 Patient : JULIENNE MANEDIEU`);
            console.log(`🆔 Code : ${uniqueCode}`);
            resolve();
        });
        stream.on('error', reject);
    });
}

generateTestPDF().catch(console.error);
