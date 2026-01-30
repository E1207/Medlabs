
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generatePatientPDF(index, firstName, lastName, patientCode) {
    const fileName = `PATIENT_${patientCode}.pdf`;
    const filePath = path.join('/Users/emmanuel/Documents/Medlabs/test', fileName);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // En-tête simulateur HGD
    doc.fontSize(16).text('LABORATOIRE DE BIOLOGIE CLINIQUE', { align: 'center' });
    doc.fontSize(12).text('CLINICAL BIOLOGY LABORATORY', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).text('Chef de Service : Pr NGOUADJEU Eveline', { align: 'center' });
    doc.text('Biologistes : Dr OLEMBA Clémentine - Dr MIAFFO Caroline', { align: 'center' });
    doc.moveDown(2);

    // Ligne de gauche (à ignorer par l'intelligence)
    doc.text(`Prélèvement du : ${new Date().toLocaleDateString('fr-FR')}`, 50, 200);
    doc.text(`Référence : REF-${Math.floor(Math.random() * 900000 + 100000)}`, 50, 215);
    doc.text(`Edition : ${new Date().toLocaleDateString('fr-FR')}`, 50, 230);

    // LE RECTANGLE (LA CIBLE)
    doc.rect(250, 190, 250, 70).stroke();
    doc.fontSize(11).text(`Mr ${lastName} ${firstName}`, 260, 200);
    doc.text(`Code Patient ${patientCode}`, 260, 220);
    doc.text('Médecin Dr IKOME GISHLEN', 260, 240);

    doc.moveDown(5);
    doc.fontSize(12).text('RESULTATS D\'ANALYSES MEDICALES', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text('Les résultats sont disponibles et validés par le biologiste.');

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => {
            console.log(`✅ Généré : ${fileName} (${lastName} ${firstName})`);
            resolve();
        });
        stream.on('error', reject);
    });
}

const patients = [
    { first: 'JULIEN', last: 'MANEDIEU', code: '260105001' },
    { first: 'EMMANUEL', last: 'PONDI', code: '260105002' },
    { first: 'ALICE', last: 'KAMGA', code: '260105003' },
    { first: 'IDRISS', last: 'EKOTTO', code: '260105004' },
    { first: 'SOPHIE', last: 'MBOUKOU', code: '260105005' },
    { first: 'JEAN', last: 'TCHATCHOUANG', code: '260105006' },
    { first: 'MARIE', last: 'NGO-YEBEL', code: '260105007' },
    { first: 'PIERRE', last: 'NKOULOU', code: '260105008' },
    { first: 'CLAUDE', last: 'ABENA', code: '260105009' },
    { first: 'MICHEL', last: 'MVELE', code: '260105010' }
];

async function run() {
    console.log('--- GÉNÉRATION DES 10 PDF DE TEST ---');
    for (let i = 0; i < patients.length; i++) {
        await generatePatientPDF(i, patients[i].first, patients[i].last, patients[i].code);
    }
    console.log('--- TOUS LES FICHIERS SONT DANS : /Users/emmanuel/Documents/Medlabs/test ---');
}

run().catch(console.error);
