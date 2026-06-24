// State Management
let pageContext = null;
let currentTab = 'chat';
let isExpanded = false;

// API Configurations
let apiConfig = {
  mockMode: true,
  provider: 'gemini',
  model: 'gemini-1.5-flash',
  apiKey: '',
  saveApiKeyLocally: true,
  enableCloudSync: true,
  account: null,
  syncHistory: []
};

// Mode-Specific States
let flashcards = [];
let currentCardIndex = 0;
let learnedCards = new Set();

let quizQuestions = [];
let currentQuizIndex = 0;
let quizScore = 0;
let selectedOptionIndex = null;
let quizSubmitted = false;

let generatedNotes = null;

// DOM Elements
const doc = {
  demoBadge: document.getElementById('demo-badge'),
  btnClose: document.getElementById('btn-close'),
  btnExpand: document.getElementById('btn-expand'),
  svgExpand: document.getElementById('svg-expand'),
  btnSettings: document.getElementById('btn-settings'),
  settingsModal: document.getElementById('settings-modal'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  
  // Tabs
  tabs: document.querySelectorAll('.tab-btn'),
  views: document.querySelectorAll('.mode-view'),
  
  // Prompt Input
  promptInput: document.getElementById('prompt-input'),
  btnSendPrompt: document.getElementById('btn-send-prompt'),
  charLimitIndicator: document.getElementById('char-limit-indicator'),
  pageContextIndicator: document.getElementById('page-context-indicator'),
  
  // Settings Controls
  toggleMockMode: document.getElementById('toggle-mock-mode'),
  apiKeysInputs: document.getElementById('api-keys-inputs'),
  selectProvider: document.getElementById('select-provider'),
  selectModel: document.getElementById('select-model'),
  inputApiKey: document.getElementById('input-api-key'),
  btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),
  toggleSaveKey: document.getElementById('toggle-save-key'),
  btnSaveApiKey: document.getElementById('btn-save-api-key'),
  apiKeySaveStatus: document.getElementById('api-key-save-status'),
  
  // Settings Account
  toggleCloudSync: document.getElementById('toggle-cloud-sync'),
  cloudSyncContainer: document.getElementById('cloud-sync-container'),
  browserSyncLogSection: document.getElementById('browser-sync-log-section'),
  accountLoggedOut: document.getElementById('account-logged-out'),
  accountLoggedIn: document.getElementById('account-logged-in'),
  syncEmail: document.getElementById('sync-email'),
  syncPassword: document.getElementById('sync-password'),
  btnSignup: document.getElementById('btn-signup'),
  btnLogin: document.getElementById('btn-login'),
  btnLogout: document.getElementById('btn-logout'),
  userDisplayEmail: document.getElementById('user-display-email'),
  syncHistoryLogs: document.getElementById('sync-history-logs'),
  
  // Chat Views
  chatMessages: document.getElementById('chat-messages'),
  suggestionChips: document.querySelectorAll('.chip'),
  
  // Summarizer View
  btnRegenSummary: document.getElementById('btn-regen-summary'),
  summaryTldr: document.getElementById('summary-tldr'),
  summaryTakeaways: document.getElementById('summary-takeaways'),
  
  // Flashcards View
  btnGenerateCards: document.getElementById('btn-generate-cards'),
  btnSyncCards: document.getElementById('btn-sync-cards'),
  deckContainer: document.getElementById('flashcards-deck-container'),
  flashcard3d: document.getElementById('flashcard-3d'),
  cardQuestion: document.getElementById('card-question-text'),
  cardAnswer: document.getElementById('card-answer-text'),
  btnPrevCard: document.getElementById('btn-prev-card'),
  btnNextCard: document.getElementById('btn-next-card'),
  deckPosition: document.getElementById('deck-position'),
  btnMarkLearned: document.getElementById('btn-mark-learned'),
  btnMarkAgain: document.getElementById('btn-mark-again'),
  statLearnedCount: document.getElementById('card-stat-learned'),
  statSyncStatus: document.getElementById('card-stat-sync'),
  
  // Quiz View
  btnGenerateQuiz: document.getElementById('btn-generate-quiz'),
  btnSyncQuiz: document.getElementById('btn-sync-quiz'),
  quizContainer: document.getElementById('quiz-container'),
  quizProgressFill: document.getElementById('quiz-progress-fill'),
  quizQuestionNum: document.getElementById('quiz-question-num'),
  quizScoreBadge: document.getElementById('quiz-score-badge'),
  quizQuestionText: document.getElementById('quiz-question-text'),
  quizOptionsList: document.getElementById('quiz-options-list'),
  btnQuizSubmit: document.getElementById('btn-quiz-submit'),
  quizResultContainer: document.getElementById('quiz-result-container'),
  quizFinalScore: document.getElementById('quiz-final-score'),
  quizResultSummary: document.getElementById('quiz-result-summary'),
  btnQuizRestart: document.getElementById('btn-quiz-restart'),
  btnQuizReviewCards: document.getElementById('btn-quiz-review-cards'),
  
  // Notes View
  btnGenerateNotes: document.getElementById('btn-generate-notes'),
  btnSyncNotes: document.getElementById('btn-sync-notes'),
  cornellNotesView: document.getElementById('cornell-notes-view'),
  cornellCuesList: document.getElementById('cornell-cues-list'),
  cornellNotesList: document.getElementById('cornell-notes-list'),
  cornellSummaryText: document.getElementById('cornell-summary-text'),
  personalNotesArea: document.getElementById('personal-notes-area'),
  notesSaveStatus: document.getElementById('notes-save-status'),
  
  // Footer Drawer
  footerSummaryToggle: document.getElementById('footer-summary-toggle'),
  footerSummaryChevron: document.getElementById('footer-summary-chevron'),
  footerSummaryContent: document.getElementById('footer-summary-content'),
  footerSummaryText: document.getElementById('footer-summary-text')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  // Load config from storage
  await loadConfig();
  
  // Hook UI Listeners
  initListeners();
  
  // Request active page content from content script
  window.parent.postMessage({ type: 'prolearner-request-content' }, '*');
});

// Load configuration from chrome storage
async function loadConfig() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const data = await chrome.storage.local.get(['prolearner_config', 'prolearner_personal_notes']);
    if (data.prolearner_config) {
      apiConfig = { ...apiConfig, ...data.prolearner_config };
    }
    if (data.prolearner_personal_notes) {
      doc.personalNotesArea.value = data.prolearner_personal_notes;
    }
  }
  
  // Apply visual configurations to UI
  updateSettingsUI();
}

// Write configurations to chrome storage
async function saveConfig() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ prolearner_config: apiConfig });
  }
}

const PROVIDER_MODELS = {
  gemini: [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash-8B' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite-preview-02-05', label: 'Gemini 2.0 Flash-Lite (Preview)' },
    { value: 'gemini-2.0-pro-exp', label: 'Gemini 2.0 Pro (Exp)' },
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
    { value: 'gemini-3.5-pro', label: 'Gemini 3.5 Pro' },
    { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' }
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'o1-mini', label: 'o1-mini' },
    { value: 'o1-preview', label: 'o1-preview' },
    { value: 'o3-mini', label: 'o3-mini' },
    { value: 'gpt-5', label: 'GPT-5' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini' }
  ]
};

function populateModelSelector() {
  const provider = doc.selectProvider.value;
  const models = PROVIDER_MODELS[provider] || [];
  
  doc.selectModel.innerHTML = models.map(m => `
    <option value="${m.value}">${m.label}</option>
  `).join('');
  
  if (models.some(m => m.value === apiConfig.model)) {
    doc.selectModel.value = apiConfig.model;
  } else {
    if (models.length > 0) {
      apiConfig.model = models[0].value;
      doc.selectModel.value = models[0].value;
    }
  }
}

// Update settings forms to match configuration state
function updateSettingsUI() {
  doc.toggleMockMode.checked = apiConfig.mockMode;
  doc.selectProvider.value = apiConfig.provider;
  populateModelSelector();
  doc.inputApiKey.value = apiConfig.apiKey;
  doc.toggleSaveKey.checked = !!apiConfig.saveApiKeyLocally;
  doc.toggleCloudSync.checked = !!apiConfig.enableCloudSync;
  
  if (apiConfig.mockMode) {
    doc.apiKeysInputs.classList.add('disabled-opacity');
    doc.demoBadge.classList.remove('hidden');
  } else {
    doc.apiKeysInputs.classList.remove('disabled-opacity');
    doc.demoBadge.classList.add('hidden');
  }

  // Handle Cloud Sync toggle
  if (apiConfig.enableCloudSync) {
    doc.cloudSyncContainer.classList.remove('disabled-opacity');
    doc.browserSyncLogSection.classList.remove('disabled-opacity');
  } else {
    doc.cloudSyncContainer.classList.add('disabled-opacity');
    doc.browserSyncLogSection.classList.add('disabled-opacity');
  }

  // Account views
  if (apiConfig.account && apiConfig.enableCloudSync) {
    doc.accountLoggedOut.classList.add('hidden');
    doc.accountLoggedIn.classList.remove('hidden');
    doc.userDisplayEmail.textContent = apiConfig.account.email;
    
    // Enable sync buttons
    doc.btnSyncCards.removeAttribute('disabled');
    doc.btnSyncQuiz.removeAttribute('disabled');
    doc.btnSyncNotes.removeAttribute('disabled');
  } else {
    if (apiConfig.account) {
      doc.accountLoggedOut.classList.add('hidden');
      doc.accountLoggedIn.classList.remove('hidden');
      doc.userDisplayEmail.textContent = apiConfig.account.email;
    } else {
      doc.accountLoggedOut.classList.remove('hidden');
      doc.accountLoggedIn.classList.add('hidden');
    }
    
    // Disable sync buttons
    doc.btnSyncCards.setAttribute('disabled', 'true');
    doc.btnSyncQuiz.setAttribute('disabled', 'true');
    doc.btnSyncNotes.setAttribute('disabled', 'true');
  }

  renderHistoryLogs();
}

// Render synchronized history list inside settings
function renderHistoryLogs() {
  if (!apiConfig.syncHistory || apiConfig.syncHistory.length === 0) {
    doc.syncHistoryLogs.innerHTML = `<p class="no-logs">No pages synced yet. Log in to start syncing browser history.</p>`;
    return;
  }
  
  doc.syncHistoryLogs.innerHTML = apiConfig.syncHistory.map(log => `
    <div class="log-item">
      <span class="log-title" title="${log.title}">${log.title}</span>
      <span class="log-time">${log.time}</span>
    </div>
  `).join('');
}

// --- SETUP LISTENERS ---
function initListeners() {
  // Page toggle controls
  doc.btnClose.addEventListener('click', () => {
    window.parent.postMessage({ type: 'prolearner-close' }, '*');
  });

  doc.btnExpand.addEventListener('click', () => {
    isExpanded = !isExpanded;
    if (isExpanded) {
      window.parent.postMessage({ type: 'prolearner-resize', width: 50 }, '*');
      doc.svgExpand.innerHTML = '<path fill="currentColor" d="M19 4h-7v2h5v5h2V4zm-7 14H6v-5H4v7h7v-2zM4 11h2v5h5v2H4v-7zm15 2h-2v-5h-5V6h7v7z"/>';
      doc.btnExpand.title = 'Compress sidebar to 25%';
    } else {
      window.parent.postMessage({ type: 'prolearner-resize', width: 25 }, '*');
      doc.svgExpand.innerHTML = '<path fill="currentColor" d="M4 4h7v2H6v5H4V4zm10 0h7v7h-2V6h-5V4zM4 14h2v5h5v2H4v-7zm15 5h-5v2h7v-7h-2v5z"/>';
      doc.btnExpand.title = 'Expand to 50% width';
    }
  });

  // Settings Modal Toggle
  doc.btnSettings.addEventListener('click', () => {
    doc.settingsModal.classList.remove('hidden');
  });

  doc.btnCloseSettings.addEventListener('click', () => {
    doc.settingsModal.classList.add('hidden');
  });

  // Tab switching
  doc.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Prompt actions
  doc.btnSendPrompt.addEventListener('click', submitUserPrompt);
  doc.promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitUserPrompt();
    }
  });

  // Suggestion chips inside Chat view
  doc.suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      doc.promptInput.value = chip.getAttribute('data-query');
      submitUserPrompt();
    });
  });

  // Settings Configuration Events
  doc.toggleMockMode.addEventListener('change', (e) => {
    apiConfig.mockMode = e.target.checked;
    saveConfig();
    updateSettingsUI();
  });

  doc.selectProvider.addEventListener('change', (e) => {
    apiConfig.provider = e.target.value;
    populateModelSelector();
    apiConfig.model = doc.selectModel.value;
  });

  doc.selectModel.addEventListener('change', (e) => {
    apiConfig.model = e.target.value;
  });

  doc.inputApiKey.addEventListener('input', (e) => {
    apiConfig.apiKey = e.target.value;
  });

  doc.toggleSaveKey.addEventListener('change', (e) => {
    apiConfig.saveApiKeyLocally = e.target.checked;
    if (!apiConfig.saveApiKeyLocally) {
      const keyBackup = apiConfig.apiKey;
      apiConfig.apiKey = '';
      saveConfig();
      apiConfig.apiKey = keyBackup;
      
      doc.apiKeySaveStatus.textContent = 'API Key persistent storage disabled.';
      doc.apiKeySaveStatus.classList.remove('hidden');
      setTimeout(() => {
        doc.apiKeySaveStatus.classList.add('hidden');
      }, 2000);
    } else {
      apiConfig.apiKey = doc.inputApiKey.value.trim();
      saveConfig();
      doc.apiKeySaveStatus.textContent = 'API Key persistent storage enabled.';
      doc.apiKeySaveStatus.classList.remove('hidden');
      setTimeout(() => {
        doc.apiKeySaveStatus.classList.add('hidden');
      }, 2000);
    }
  });

  doc.btnSaveApiKey.addEventListener('click', () => {
    apiConfig.apiKey = doc.inputApiKey.value.trim();
    apiConfig.provider = doc.selectProvider.value;
    apiConfig.model = doc.selectModel.value;
    apiConfig.saveApiKeyLocally = doc.toggleSaveKey.checked;
    
    if (apiConfig.saveApiKeyLocally) {
      saveConfig();
    } else {
      const keyBackup = apiConfig.apiKey;
      apiConfig.apiKey = '';
      saveConfig();
      apiConfig.apiKey = keyBackup;
    }
    
    doc.apiKeySaveStatus.textContent = 'Saved successfully!';
    doc.apiKeySaveStatus.classList.remove('hidden');
    setTimeout(() => {
      doc.apiKeySaveStatus.classList.add('hidden');
    }, 2000);
  });

  doc.toggleCloudSync.addEventListener('change', (e) => {
    apiConfig.enableCloudSync = e.target.checked;
    saveConfig();
    updateSettingsUI();
  });

  doc.btnToggleKeyVisibility.addEventListener('click', () => {
    const isPw = doc.inputApiKey.type === 'password';
    doc.inputApiKey.type = isPw ? 'text' : 'password';
    doc.btnToggleKeyVisibility.textContent = isPw ? 'Hide' : 'Show';
  });

  // Account actions
  doc.btnSignup.addEventListener('click', handleAccountSignup);
  doc.btnLogin.addEventListener('click', handleAccountLogin);
  doc.btnLogout.addEventListener('click', handleAccountLogout);

  // Sync actions
  doc.btnSyncCards.addEventListener('click', () => simulateSync('cards', doc.btnSyncCards));
  doc.btnSyncQuiz.addEventListener('click', () => simulateSync('quiz', doc.btnSyncQuiz));
  doc.btnSyncNotes.addEventListener('click', () => simulateSync('notes', doc.btnSyncNotes));

  // Feature specific buttons
  doc.btnRegenSummary.addEventListener('click', generateSummary);
  
  doc.btnGenerateCards.addEventListener('click', generateFlashcards);
  doc.flashcard3d.addEventListener('click', () => {
    doc.flashcard3d.classList.toggle('flipped');
  });
  doc.btnPrevCard.addEventListener('click', navigatePrevCard);
  doc.btnNextCard.addEventListener('click', navigateNextCard);
  doc.btnMarkLearned.addEventListener('click', markCardAsLearned);
  doc.btnMarkAgain.addEventListener('click', markCardStudyAgain);

  doc.btnGenerateQuiz.addEventListener('click', generateQuiz);
  doc.btnQuizSubmit.addEventListener('click', submitQuizAnswer);
  doc.btnQuizRestart.addEventListener('click', restartQuiz);
  doc.btnQuizReviewCards.addEventListener('click', () => switchTab('flashcards'));

  doc.btnGenerateNotes.addEventListener('click', generateCornellNotes);
  doc.personalNotesArea.addEventListener('input', (e) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ prolearner_personal_notes: e.target.value });
    }
    doc.notesSaveStatus.textContent = 'Auto-saving...';
    setTimeout(() => {
      doc.notesSaveStatus.textContent = 'Saved locally';
    }, 1000);
  });

  // Persistent Drawer toggling
  doc.footerSummaryToggle.addEventListener('click', () => {
    doc.footerSummaryHeader = doc.footerSummaryToggle.classList.toggle('active');
    doc.footerSummaryContent.classList.toggle('collapsed');
  });

  // Listen to content script replies
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg && msg.type === 'prolearner-page-content') {
      pageContext = msg.data;
      doc.pageContextIndicator.classList.remove('hidden');
      doc.charLimitIndicator.textContent = `Text size: ${pageContext.content.length} chars`;
      
      // Auto-trigger the default summary upon loading
      generateSummary();
    }
  });
}

// Tab navigation handler
function switchTab(tabId) {
  currentTab = tabId;
  doc.tabs.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  doc.views.forEach(view => {
    if (view.id === `view-${tabId}`) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });
}

// --- CORE AI AND MOCK LOGIC ---

// Helper to extract page keywords for high-fidelity mocks
function getKeywords() {
  if (!pageContext) return ['learning', 'technology', 'education', 'research'];
  
  const textSource = `${pageContext.title} ${pageContext.content.substring(0, 300)}`;
  const cleanWords = textSource
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => {
      return word.length > 4 && 
        !['about', 'would', 'could', 'their', 'there', 'these', 'those', 'which', 'other', 'using'].includes(word);
    });
  
  const uniqueWords = [...new Set(cleanWords)];
  return uniqueWords.length >= 4 ? uniqueWords.slice(0, 6) : ['concept', 'information', 'resource', 'study'];
}

// Mock AI generators
const mockGenerator = {
  summary: () => {
    const k = getKeywords();
    return {
      tldr: `This page provides a detailed breakdown of ${pageContext?.title || 'the current resource'}. It reviews critical mechanics associated with ${k[0]} and explains how ${k[1]} can be integrated effectively to maximize overall progress.`,
      takeaways: [
        `Core focus revolves around optimizing standard operations in relation to ${k[0]}.`,
        `Analyzing ${k[1]} provides key data patterns that clarify learning performance guidelines.`,
        `Integrating a secondary workflow containing ${k[2] || 'structured elements'} yields faster response times.`,
        `Users should focus on setting proper indicators for ${k[3] || 'context limits'} to avoid processing discrepancies.`
      ]
    };
  },
  
  chat: (prompt) => {
    const k = getKeywords();
    const cleanPrompt = prompt.toLowerCase();
    
    if (cleanPrompt.includes('summary') || cleanPrompt.includes('summarize')) {
      return `Here is a quick summary: The active document covers "${pageContext?.title || 'web content'}". Key points involve: 1) ${k[0].toUpperCase()} adjustments, 2) ${k[1]} evaluations, and 3) ${k[2] || 'general setup'}.`;
    }
    
    if (cleanPrompt.includes('quiz') || cleanPrompt.includes('test')) {
      return `To test your knowledge on this page, click the "Quiz" tab above. I can generate customized multiple-choice questions for you there!`;
    }

    if (cleanPrompt.includes('flashcard') || cleanPrompt.includes('card')) {
      return `You can study terms in depth by clicking the "Cards" tab at the top. It has interactive 3D flip cards generated from this content!`;
    }

    return `Based on "${pageContext?.title || 'this page'}", the core topic explores ${k[0]} systems. Regarding your question: "${prompt}", we can see that ${k[0]} coordinates directly with ${k[1]} elements to create a stable architecture. Let me know if you want me to expand on any particular aspect!`;
  },
  
  flashcards: () => {
    const k = getKeywords();
    return [
      {
        question: `What is the primary theme explored on this page?`,
        answer: `The primary theme centers on ${pageContext?.title || 'the active page content'}, specifically looking at how ${k[0]} can be utilized.`
      },
      {
        question: `Why is the study of ${k[0]} highly relevant in this context?`,
        answer: `It is relevant because it coordinates with ${k[1] || 'active mechanics'} to build the foundational framework of the page's subject.`
      },
      {
        question: `How does ${k[1] || 'the secondary asset'} behave according to the text?`,
        answer: `It serves as a secondary driver, helping to stabilize operations and provide consistent feedback for ${k[2] || 'performance metrics'}.`
      },
      {
        question: `State one key rule when configuring ${k[2] || 'the core variables'}.`,
        answer: `Ensure that all inputs align with ${k[3] || 'basic parameters'} and that limits are validated before execution.`
      },
      {
        question: `Define ${k[3] || 'the parameters'} based on the context.`,
        answer: `They represent the structural constraints and standard configurations that govern ${pageContext?.title || 'these files'}.`
      }
    ];
  },
  
  quiz: () => {
    const k = getKeywords();
    return [
      {
        question: `What is the main subject matter discussed in "${pageContext?.title || 'this page'}"?`,
        options: [
          `Optimizing workflows and configuring ${k[0]} applications`,
          `Configuring remote database arrays and database protocols`,
          `Basic visual formatting using cascading stylesheets`,
          `Setting up developer options in browser panels`
        ],
        answerIndex: 0
      },
      {
        question: `Which key concept is highly related to ${k[0]} according to the page content?`,
        options: [
          `The performance metrics of ${k[1]}`,
          `External library files`,
          `Hardware requirements`,
          `Standard network security guidelines`
        ],
        answerIndex: 0
      },
      {
        question: `What is a best practice recommended when managing ${k[2] || 'data outputs'}?`,
        options: [
          `Do not apply any configuration or syntax checks`,
          `Validate parameters according to ${k[3] || 'operational limits'} guidelines`,
          `Rewrite the entire application structure`,
          `Execute code directly on staging servers`
        ],
        answerIndex: 1
      }
    ];
  },
  
  notes: () => {
    const k = getKeywords();
    return {
      cues: [
        `Main Objective`,
        `Primary Mechanics`,
        `Implementation Key`
      ],
      notes: [
        `Study of ${pageContext?.title || 'the webpage'} focuses on overall layout analysis.`,
        `${k[0].toUpperCase()} works as the main element guiding structural components.`,
        `Always cross-reference the configurations of ${k[1]} and check parameters regularly.`
      ],
      summary: `A structured Cornell breakdown of ${pageContext?.title || 'this website'}, detailing the coordination of ${k[0]} with ${k[1]} and standard implementation procedures.`
    };
  }
};

// Generic LLM API caller
async function executeLLMCall(systemPrompt, userPrompt) {
  if (apiConfig.mockMode) {
    throw new Error("Mock Mode is active. Switch to live API inside Settings.");
  }
  
  const key = apiConfig.apiKey.trim();
  if (!key) {
    throw new Error("API Key is missing. Please set it in Settings.");
  }
  
  const pageText = pageContext ? pageContext.content : "No page text extracted.";
  
  if (apiConfig.provider === 'gemini') {
    // Call Gemini API
    const model = apiConfig.model || 'gemini-1.5-flash';
    // Use v1 for stable models, v1beta for experimental/preview models
    const apiVersion = model.includes('2.0') || model.includes('3.5') || model.includes('exp') ? 'v1beta' : 'v1';
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nPage Text Context:\n${pageText}\n\nUser Question/Instruction:\n${userPrompt}` }]
        }],
        generationConfig: { temperature: 0.2 }
      })
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API returned status ${response.status}`);
    }
    const result = await response.json();
    return result.candidates[0].content.parts[0].text;
    
  } else {
    // Call OpenAI API
    const model = apiConfig.model || 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Page Text Context:\n${pageText}\n\nInstruction:\n${userPrompt}` }
        ],
        temperature: 0.2
      })
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API returned status ${response.status}`);
    }
    const result = await response.json();
    return result.choices[0].message.content;
  }
}

// Clean JSON codeblock wrappers from AI output
function parseCleanJSON(str) {
  let clean = str.trim();
  if (clean.startsWith('```')) {
    // Remove markdown code fence block
    clean = clean.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
  }
  return JSON.parse(clean.trim());
}

// --- FUNCTIONALITIES ---

// 1. Chat Prompt Submission
async function submitUserPrompt() {
  const text = doc.promptInput.value.trim();
  if (!text) return;
  
  // Append User Bubble
  appendChatMessage(text, 'user');
  doc.promptInput.value = '';
  
  // Append Bot Spinner
  const botMsgId = appendChatMessage('Generating answer...', 'bot', true);
  
  try {
    let reply = '';
    if (apiConfig.mockMode) {
      // Simulate delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 800));
      reply = mockGenerator.chat(text);
    } else {
      const systemPrompt = "You are a professional educational assistant named ProLearner. Answer the user's question regarding the page text provided. Keep your answers concise, clear, and focused on helping them learn.";
      reply = await executeLLMCall(systemPrompt, text);
    }
    
    updateChatMessage(botMsgId, reply);
  } catch (error) {
    updateChatMessage(botMsgId, `⚠️ Error generating answer: ${error.message}`);
  }
}

function appendChatMessage(content, sender, isSpinner = false) {
  const msgDiv = document.createElement('div');
  const msgId = 'msg-' + Date.now();
  msgDiv.className = `msg ${sender}`;
  msgDiv.id = msgId;
  
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'msg-bubble';
  if (isSpinner) {
    bubbleDiv.innerHTML = '<span class="pulse-dot"></span> Thinking...';
  } else {
    bubbleDiv.textContent = content;
  }
  
  msgDiv.appendChild(bubbleDiv);
  doc.chatMessages.appendChild(msgDiv);
  doc.chatMessages.scrollTop = doc.chatMessages.scrollHeight;
  
  return msgId;
}

function updateChatMessage(msgId, content) {
  const msgDiv = document.getElementById(msgId);
  if (msgDiv) {
    const bubble = msgDiv.querySelector('.msg-bubble');
    if (bubble) {
      bubble.textContent = content;
    }
    doc.chatMessages.scrollTop = doc.chatMessages.scrollHeight;
  }
}

// 2. Summary Generation
async function generateSummary() {
  doc.summaryTldr.textContent = "Loading page content and preparing summary...";
  doc.summaryTakeaways.innerHTML = `<li>Analyzing webpage content...</li><li>Preparing study points...</li>`;
  doc.footerSummaryText.textContent = "Generating page summary...";
  
  try {
    let summaryData;
    if (apiConfig.mockMode) {
      await new Promise(resolve => setTimeout(resolve, 600));
      summaryData = mockGenerator.summary();
    } else {
      const systemPrompt = "Analyze the page content and provide a summary in the following JSON format: { \"tldr\": \"A 1-2 sentence high-level summary\", \"takeaways\": [\"Bullet point 1\", \"Bullet point 2\", \"Bullet point 3\", \"Bullet point 4\"] }. Return ONLY the raw JSON string without any markdown formatting or code blocks.";
      const rawResponse = await executeLLMCall(systemPrompt, "Generate the summary JSON.");
      summaryData = parseCleanJSON(rawResponse);
    }
    
    // Render Summary
    doc.summaryTldr.textContent = summaryData.tldr;
    doc.footerSummaryText.textContent = summaryData.tldr;
    
    doc.summaryTakeaways.innerHTML = summaryData.takeaways
      .map(item => `<li>${item}</li>`)
      .join('');
      
  } catch (error) {
    doc.summaryTldr.textContent = `⚠️ Error preparing summary: ${error.message}`;
    doc.footerSummaryText.textContent = "Could not generate summary overview.";
    doc.summaryTakeaways.innerHTML = `<li>Please check your API key / configurations inside Settings.</li>`;
  }
}

// 3. Flashcards study mode
async function generateFlashcards() {
  doc.btnGenerateCards.textContent = "Generating Cards...";
  doc.btnGenerateCards.setAttribute('disabled', 'true');
  
  try {
    if (apiConfig.mockMode) {
      await new Promise(resolve => setTimeout(resolve, 800));
      flashcards = mockGenerator.flashcards();
    } else {
      const systemPrompt = "Generate a set of 5 flashcards based on the key concepts of the page content. Return them in the following JSON format: [ { \"question\": \"Question or term\", \"answer\": \"Answer or definition\" }, ... ]. Return ONLY the raw JSON string without any markdown formatting or code blocks.";
      const rawResponse = await executeLLMCall(systemPrompt, "Generate 5 flashcards.");
      flashcards = parseCleanJSON(rawResponse);
    }
    
    currentCardIndex = 0;
    learnedCards.clear();
    
    renderActiveCard();
    doc.deckContainer.classList.remove('hidden');
    doc.btnGenerateCards.textContent = "Regenerate Cards";
    doc.btnGenerateCards.removeAttribute('disabled');
    
  } catch (error) {
    alert(`Error generating cards: ${error.message}`);
    doc.btnGenerateCards.textContent = "Generate Flashcards";
    doc.btnGenerateCards.removeAttribute('disabled');
  }
}

function renderActiveCard() {
  if (flashcards.length === 0) return;
  
  const card = flashcards[currentCardIndex];
  doc.flashcard3d.classList.remove('flipped');
  
  // Wait for flip transition back before updating content
  setTimeout(() => {
    doc.cardQuestion.textContent = card.question;
    doc.cardAnswer.textContent = card.answer;
  }, 150);

  doc.deckPosition.textContent = `Card ${currentCardIndex + 1} of ${flashcards.length}`;
  doc.statLearnedCount.textContent = `Learned: ${learnedCards.size} / ${flashcards.length}`;
  
  // Highlight review status
  if (learnedCards.has(currentCardIndex)) {
    doc.flashcard3d.style.borderColor = 'var(--accent-emerald)';
  } else {
    doc.flashcard3d.style.borderColor = 'var(--border-color)';
  }
}

function navigatePrevCard() {
  if (flashcards.length === 0) return;
  currentCardIndex = (currentCardIndex - 1 + flashcards.length) % flashcards.length;
  renderActiveCard();
}

function navigateNextCard() {
  if (flashcards.length === 0) return;
  currentCardIndex = (currentCardIndex + 1) % flashcards.length;
  renderActiveCard();
}

function markCardAsLearned() {
  if (flashcards.length === 0) return;
  learnedCards.add(currentCardIndex);
  renderActiveCard();
  
  // Auto-advance after a small delay
  setTimeout(() => {
    if (learnedCards.size < flashcards.length) {
      navigateNextCard();
    }
  }, 500);
}

function markCardStudyAgain() {
  if (flashcards.length === 0) return;
  learnedCards.delete(currentCardIndex);
  renderActiveCard();
}

// 4. Quiz Mode
async function generateQuiz() {
  doc.btnGenerateQuiz.textContent = "Generating Quiz...";
  doc.btnGenerateQuiz.setAttribute('disabled', 'true');
  doc.quizResultContainer.classList.add('hidden');
  
  try {
    if (apiConfig.mockMode) {
      await new Promise(resolve => setTimeout(resolve, 800));
      quizQuestions = mockGenerator.quiz();
    } else {
      const systemPrompt = "Generate a multiple-choice quiz of 3 questions based on the page content. Return them in the following JSON format: [ { \"question\": \"The question text\", \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"], \"answerIndex\": 0 }, ... ]. The answerIndex is the 0-based index of the correct option. Return ONLY the raw JSON string without any markdown formatting or code blocks.";
      const rawResponse = await executeLLMCall(systemPrompt, "Generate a 3-question quiz.");
      quizQuestions = parseCleanJSON(rawResponse);
    }
    
    currentQuizIndex = 0;
    quizScore = 0;
    selectedOptionIndex = null;
    quizSubmitted = false;
    
    renderActiveQuestion();
    doc.quizContainer.classList.remove('hidden');
    doc.btnGenerateQuiz.textContent = "Regenerate Quiz";
    doc.btnGenerateQuiz.removeAttribute('disabled');
    
  } catch (error) {
    alert(`Error generating quiz: ${error.message}`);
    doc.btnGenerateQuiz.textContent = "Generate Webpage Quiz";
    doc.btnGenerateQuiz.removeAttribute('disabled');
  }
}

function renderActiveQuestion() {
  if (quizQuestions.length === 0) return;
  
  const question = quizQuestions[currentQuizIndex];
  doc.quizQuestionText.textContent = question.question;
  doc.quizQuestionNum.textContent = `Question ${currentQuizIndex + 1} of ${quizQuestions.length}`;
  doc.quizScoreBadge.textContent = `Score: ${quizScore}`;
  
  // Progress fill
  const progressPercent = (currentQuizIndex / quizQuestions.length) * 100;
  doc.quizProgressFill.style.width = `${progressPercent}%`;
  
  // Populate options
  doc.quizOptionsList.innerHTML = '';
  question.options.forEach((optText, index) => {
    const optDiv = document.createElement('div');
    optDiv.className = 'quiz-opt';
    optDiv.innerHTML = `<span class="quiz-opt-letter">${String.fromCharCode(65 + index)}.</span> <span>${escapeHTML(optText)}</span>`;
    optDiv.addEventListener('click', () => selectQuizOption(index));
    doc.quizOptionsList.appendChild(optDiv);
  });
  
  selectedOptionIndex = null;
  quizSubmitted = false;
  doc.btnQuizSubmit.textContent = "Submit Answer";
  doc.btnQuizSubmit.setAttribute('disabled', 'true');
}

function selectQuizOption(index) {
  if (quizSubmitted) return;
  
  selectedOptionIndex = index;
  const options = doc.quizOptionsList.querySelectorAll('.quiz-opt');
  options.forEach((opt, idx) => {
    if (idx === index) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });
  
  doc.btnQuizSubmit.removeAttribute('disabled');
}

function submitQuizAnswer() {
  if (quizQuestions.length === 0 || selectedOptionIndex === null) return;
  
  const q = quizQuestions[currentQuizIndex];
  const options = doc.quizOptionsList.querySelectorAll('.quiz-opt');
  
  if (!quizSubmitted) {
    // Show correct / incorrect classes
    quizSubmitted = true;
    
    options.forEach((opt, idx) => {
      if (idx === q.answerIndex) {
        opt.className = 'quiz-opt correct';
      } else if (idx === selectedOptionIndex) {
        opt.className = 'quiz-opt incorrect';
      } else {
        opt.className = 'quiz-opt';
      }
    });
    
    if (selectedOptionIndex === q.answerIndex) {
      quizScore++;
      doc.quizScoreBadge.textContent = `Score: ${quizScore}`;
    }
    
    // Change submit button text
    if (currentQuizIndex === quizQuestions.length - 1) {
      doc.btnQuizSubmit.textContent = "View Quiz Results";
    } else {
      doc.btnQuizSubmit.textContent = "Next Question";
    }
  } else {
    // Proceed to next question or complete quiz
    currentQuizIndex++;
    if (currentQuizIndex < quizQuestions.length) {
      renderActiveQuestion();
    } else {
      completeQuiz();
    }
  }
}

function completeQuiz() {
  doc.quizProgressFill.style.width = `100%`;
  doc.quizContainer.classList.add('hidden');
  doc.quizResultContainer.classList.remove('hidden');
  
  const pct = Math.round((quizScore / quizQuestions.length) * 100);
  doc.quizFinalScore.textContent = `${quizScore}/${quizQuestions.length}`;
  
  let summaryText = "";
  if (pct === 100) {
    summaryText = `Incredible! You scored 100% on this page content. You've fully mastered the material.`;
  } else if (pct >= 60) {
    summaryText = `Good job! You scored ${pct}%. Review your flashcards to secure a perfect score next time.`;
  } else {
    summaryText = `You scored ${pct}%. Try reviewing the Cornell Notes or the page summary sheet, then give it another shot!`;
  }
  doc.quizResultSummary.textContent = summaryText;
}

function restartQuiz() {
  doc.quizResultContainer.classList.add('hidden');
  generateQuiz();
}

// 5. Notes Mode
async function generateCornellNotes() {
  doc.btnGenerateNotes.textContent = "Generating Cornell Notes...";
  doc.btnGenerateNotes.setAttribute('disabled', 'true');
  
  try {
    if (apiConfig.mockMode) {
      await new Promise(resolve => setTimeout(resolve, 850));
      generatedNotes = mockGenerator.notes();
    } else {
      const systemPrompt = "Analyze the page content and generate structured study notes summarizing it in Cornell notes style. Return them in the following JSON format: { \"cues\": [\"Key cue/term 1\", \"Key cue/term 2\", ...], \"notes\": [\"Elaborative detail/fact 1\", \"Elaborative detail/fact 2\", ...], \"summary\": \"A short synthesis paragraph of the page content.\" }. Return ONLY the raw JSON string without any markdown formatting or code blocks.";
      const rawResponse = await executeLLMCall(systemPrompt, "Generate Cornell Notes JSON.");
      generatedNotes = parseCleanJSON(rawResponse);
    }
    
    // Render Cornell notes
    doc.cornellCuesList.innerHTML = generatedNotes.cues
      .map(cue => `<li>${escapeHTML(cue)}</li>`)
      .join('');
      
    doc.cornellNotesList.innerHTML = generatedNotes.notes
      .map(note => `<li>${escapeHTML(note)}</li>`)
      .join('');
      
    doc.cornellSummaryText.textContent = generatedNotes.summary;
    
    doc.cornellNotesView.classList.remove('hidden');
    doc.btnGenerateNotes.textContent = "Regenerate Cornell Notes";
    doc.btnGenerateNotes.removeAttribute('disabled');
    
  } catch (error) {
    alert(`Error generating notes: ${error.message}`);
    doc.btnGenerateNotes.textContent = "Generate Cornell Notes";
    doc.btnGenerateNotes.removeAttribute('disabled');
  }
}

// --- CLOUD SYNC SIMULATOR ---

function handleAccountSignup() {
  const email = doc.syncEmail.value.trim();
  const password = doc.syncPassword.value.trim();
  
  if (!email || !password) {
    alert("Please enter a valid email and password.");
    return;
  }
  
  // Simulate signup
  doc.btnSignup.textContent = "Signing up...";
  setTimeout(() => {
    apiConfig.account = { email };
    saveConfig();
    updateSettingsUI();
    doc.btnSignup.textContent = "Sign Up";
    alert(`Successfully registered ProLearner account for: ${email}`);
  }, 1000);
}

function handleAccountLogin() {
  const email = doc.syncEmail.value.trim();
  const password = doc.syncPassword.value.trim();
  
  if (!email || !password) {
    alert("Please enter your account credentials.");
    return;
  }
  
  // Simulate login
  doc.btnLogin.textContent = "Logging in...";
  setTimeout(() => {
    apiConfig.account = { email };
    saveConfig();
    updateSettingsUI();
    doc.btnLogin.textContent = "Log In";
  }, 800);
}

function handleAccountLogout() {
  apiConfig.account = null;
  saveConfig();
  updateSettingsUI();
}

function simulateSync(featureName, syncButton) {
  if (!apiConfig.account || !apiConfig.enableCloudSync) return;
  
  syncButton.classList.add('sync-active');
  syncButton.setAttribute('disabled', 'true');
  
  setTimeout(() => {
    syncButton.classList.remove('sync-active');
    syncButton.removeAttribute('disabled');
    
    // Add page to browser sync history
    const pageTitle = pageContext ? pageContext.title : "Active Page";
    const pageUrl = pageContext ? pageContext.url : "";
    const dateStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (!apiConfig.syncHistory) apiConfig.syncHistory = [];
    
    // Unshift to place latest sync at top
    apiConfig.syncHistory.unshift({
      title: pageTitle,
      url: pageUrl,
      time: dateStr
    });
    
    // Cap at 10 items
    if (apiConfig.syncHistory.length > 10) {
      apiConfig.syncHistory.pop();
    }
    
    saveConfig();
    updateSettingsUI();
    
    // Show temporary feedback indicator
    const originalText = syncButton.innerHTML;
    syncButton.innerHTML = "✓ Synced";
    syncButton.style.borderColor = "var(--accent-emerald)";
    syncButton.style.color = "var(--accent-emerald)";
    
    if (featureName === 'cards') {
      doc.statSyncStatus.textContent = "Synced to Cloud";
      doc.statSyncStatus.style.color = "var(--accent-emerald)";
    }
    
    setTimeout(() => {
      syncButton.innerHTML = originalText;
      syncButton.style.borderColor = "";
      syncButton.style.color = "";
    }, 2000);
    
  }, 1200);
}

// --- HELPERS ---
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
