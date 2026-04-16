const fs = require('fs');
const path = require('path');

const replacements = [
    { file: 'components/CarInsuranceWizard1.tsx', find: 'Auto-Neural Module', replace: 'Modul Otomatis' },
    { file: 'components/ProductAIExplainer.tsx', find: 'bg-neural-mesh', replace: 'bg-slate-900' },
    { file: 'components/ProductAIExplainer.tsx', find: 'neuralBenefits', replace: 'benefits' },
    { file: 'components/ProductAIExplainer.tsx', find: 'Neural Guard', replace: 'Smart Security' },
    { file: 'components/MPARInsuranceWizard.tsx', find: 'Neural Scan', replace: 'Proses Scanning' },
    { file: 'components/MPARInsuranceWizard.tsx', find: 'Neural Item Audit', replace: 'Audit Item' },
    { file: 'components/MPARInsuranceWizard.tsx', find: 'INITIALIZE NEURAL SCAN', replace: 'MULAI SCANNING' },
    { file: 'components/ContactPage.tsx', find: 'neural support team', replace: 'tim support' },
    { file: 'components/LoginModal.tsx', find: 'Neural OS v3.0 Encryption', replace: 'Sistem Keamanan Terenkripsi' },
    { file: 'components/PortalHero.tsx', find: 'Neural travel protection worldwide.', replace: 'Perlindungan perjalanan ke seluruh dunia.' },
    { file: 'components/PortalHero.tsx', find: 'Perlindungan perjalanan neural', replace: 'Perlindungan perjalanan instan' },
    { file: 'components/TravelInsuranceWizard.tsx', find: 'Neural Travel OS v3.', replace: 'Sistem Asuransi Perjalanan Digital.' },
    { file: 'components/TravelInsuranceWizard.tsx', find: 'instant neural underwriting.', replace: 'proses persetujuan instan.' },
    { file: 'components/TravelInsuranceWizard.tsx', find: 'Neural Plan', replace: 'Paket' },
    { file: 'components/TravelInsuranceWizard.tsx', find: 'Neural Trip Summary', replace: 'Ringkasan Perjalanan' },
    { file: 'components/UserProfile.tsx', find: 'neural reset link', replace: 'link reset' },
    { file: 'components/UserProfile.tsx', find: 'Neural Link Handshake', replace: 'Proses Sinkronisasi Link' },
    { file: 'components/UserProfile.tsx', find: 'Neural Score:', replace: 'Skor Kendaraan:' },
    { file: 'components/UserProfile.tsx', find: 'Neural Biometrics', replace: 'Login Biometrik' },
    { file: 'components/UserProfile.tsx', find: 'Neural Trust Score Meter', replace: 'Trust Score Meter' },
    { file: 'components/UserProfile.tsx', find: 'Neural Trust Level', replace: 'Tingkat Kepercayaan' },
    { file: 'components/AppSelector.tsx', find: 'neural monitoring', replace: 'digital monitoring' },
    { file: 'components/AppSelector.tsx', find: 'bg-neural-grid', replace: 'bg-slate-900/5' },
    { file: 'components/AppSelector.tsx', find: 'neural path', replace: 'proses selanjutnya' },
    { file: 'components/PartnerView.tsx', find: 'neural commissions', replace: 'komisi' },
    { file: 'components/PartnerView.tsx', find: 'Auto Neural', replace: 'Auto Aktif' },
    { file: 'components/CarInsuranceWizard.tsx', find: 'Neural Node Teraktivasi.', replace: 'Sistem Teraktivasi.' },
    { file: 'components/PAInsuranceWizard.tsx', find: 'Neural Personal Accident OS.', replace: 'Sistem Asuransi Kecelakaan Diri.' },
    { file: 'components/PAInsuranceWizard.tsx', find: 'Neural validation', replace: 'Validasi sistem' },
    { file: 'components/PAInsuranceWizard.tsx', find: 'neural otomatis', replace: 'secara otomatis' },
    { file: 'components/AuthGate.tsx', find: 'Neural Access Point: Secure', replace: 'Sistem Keamanan Akses: Aktif' },
    { file: 'components/AuthGate.tsx', find: 'Neural Guard', replace: 'Smart Security' },
    { file: 'components/ClaimManager.tsx', find: 'Neural Engine', replace: 'Sistem Cerdas' },
    { file: 'components/ClaimManager.tsx', find: 'Neural Audit Result', replace: 'Hasil Audit' },
    { file: 'components/ClaimManager.tsx', find: 'Neural verify protocol', replace: 'Protokol verifikasi' },
    { file: 'components/ClaimManager.tsx', find: 'verifikasi neural', replace: 'verifikasi otomatis' },
    { file: 'components/car-wizard/StepPreSummary1.tsx', find: 'Neural Scan', replace: 'Proses Scanning' },
    { file: 'components/car-wizard/WizardUI.tsx', find: 'NeuralBot', replace: 'SmartBot' },
    { file: 'components/car-wizard/WizardUI.tsx', find: 'NeuralProcessingView', replace: 'SmartProcessingView' },
    { file: 'components/car-wizard/StepSurvey.tsx', find: 'NeuralProcessingView', replace: 'SmartProcessingView' }
];

replacements.forEach(({ file, find, replace }) => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(new RegExp(find, 'g'), replace);
        fs.writeFileSync(fullPath, content);
    }
});

// Extra fix for car wizard files 
const filesToReplaceBot = [
    'components/car-wizard/WizardUI.tsx',
    'components/car-wizard/StepSurvey.tsx',
    'components/ClaimManager.tsx',
    'components/admin/AdminViews.tsx'
];
filesToReplaceBot.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(/NeuralBot/g, 'SmartBot');
        content = content.replace(/NeuralProcessingView/g, 'SmartProcessingView');
        fs.writeFileSync(fullPath, content);
    }
});
