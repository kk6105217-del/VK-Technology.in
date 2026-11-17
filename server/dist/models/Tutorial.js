"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tutorial = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const HardwareComponentSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    product_id: { type: Number },
    notes: { type: String },
});
const PdfDownloadSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    file_size: { type: String },
});
const TutorialSchema = new mongoose_1.Schema({
    id: { type: Number, index: true },
    tutorial_title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    difficulty: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner',
        index: true,
    },
    estimated_time: { type: String, default: '2 Hours' },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    pdf_downloads: { type: [PdfDownloadSchema], default: [] },
    source_code: {
        github_url: { type: String },
        snippet: { type: String },
        language: { type: String, default: 'cpp' },
    },
    hardware_components: { type: [HardwareComponentSchema], default: [] },
    access_permissions: {
        type: String,
        enum: ['public', 'registered', 'purchased_only'],
        default: 'public',
        index: true,
    },
    related_product_ids: { type: [Number], default: [] },
    is_published: { type: Boolean, default: true, index: true },
    views_count: { type: Number, default: 0 },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
TutorialSchema.index({ category: 1, difficulty: 1, is_published: 1 });
exports.Tutorial = mongoose_1.default.models.Tutorial || mongoose_1.default.model('Tutorial', TutorialSchema);
