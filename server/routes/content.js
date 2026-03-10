const express = require('express');
const LegalDocument = require('../models/LegalDocument');
const {
  DEFAULT_TERMS_SLUG,
  defaultLastUpdatedLabel
} = require('../constants/defaultTermsContent');

const router = express.Router();

const ensureTermsDocument = async () => {
  let termsDoc = await LegalDocument.findOne({ slug: DEFAULT_TERMS_SLUG })
    .select('title lastUpdatedLabel publicContent settingsContent updatedAt');

  if (!termsDoc) {
    await LegalDocument.create({ slug: DEFAULT_TERMS_SLUG });
    termsDoc = await LegalDocument.findOne({ slug: DEFAULT_TERMS_SLUG })
      .select('title lastUpdatedLabel publicContent settingsContent updatedAt');
  }

  return termsDoc;
};

router.get('/terms', async (req, res) => {
  try {
    const termsDoc = await ensureTermsDocument();
    if (!termsDoc) {
      return res.status(500).json({ message: 'Unable to load Terms document' });
    }

    res.json({
      id: termsDoc._id,
      title: termsDoc.title || 'Terms & Conditions',
      lastUpdatedLabel: termsDoc.lastUpdatedLabel || defaultLastUpdatedLabel,
      publicContent: termsDoc.publicContent || '',
      settingsContent: termsDoc.settingsContent || '',
      updatedAt: termsDoc.updatedAt || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
