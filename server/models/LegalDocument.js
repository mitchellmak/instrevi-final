const mongoose = require('mongoose');
const {
  defaultLastUpdatedLabel,
  defaultPublicTermsContent,
  defaultSettingsTermsContent
} = require('../constants/defaultTermsContent');

const legalDocumentSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 120
  },
  title: {
    type: String,
    default: 'Terms & Conditions',
    trim: true,
    maxlength: 200
  },
  lastUpdatedLabel: {
    type: String,
    default: defaultLastUpdatedLabel,
    trim: true,
    maxlength: 80
  },
  publicContent: {
    type: String,
    default: defaultPublicTermsContent
  },
  settingsContent: {
    type: String,
    default: defaultSettingsTermsContent
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LegalDocument', legalDocumentSchema);
