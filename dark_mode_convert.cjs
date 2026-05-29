const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  // Backgrounds
  { regex: /\bbg-white\b/g, replace: 'bg-gray-900' },
  { regex: /\bbg-gray-50\/50\b/g, replace: 'bg-[#0f0f0f]' },
  { regex: /\bbg-gray-50\b/g, replace: 'bg-gray-800' },
  { regex: /\bbg-gray-100\b/g, replace: 'bg-gray-800' },
  { regex: /\bbg-gray-200\b/g, replace: 'bg-gray-700' },
  
  // Texts
  { regex: /\btext-gray-900\b/g, replace: 'text-gray-100' },
  { regex: /\btext-gray-800\b/g, replace: 'text-gray-200' },
  { regex: /\btext-gray-700\b/g, replace: 'text-gray-300' },
  { regex: /\btext-gray-600\b/g, replace: 'text-gray-400' },
  { regex: /\btext-gray-500\b/g, replace: 'text-gray-400' },
  { regex: /\btext-gray-400\b/g, replace: 'text-gray-500' },
  { regex: /\btext-gray-300\b/g, replace: 'text-gray-600' },

  // Borders
  { regex: /\bborder-gray-200\b/g, replace: 'border-gray-800' },
  { regex: /\bborder-gray-100\b/g, replace: 'border-gray-800' },
  { regex: /\bborder-gray-300\b/g, replace: 'border-gray-700' },

  // Hovers
  { regex: /\bhover:bg-gray-50\b/g, replace: 'hover:bg-gray-800' },
  { regex: /\bhover:bg-gray-100\b/g, replace: 'hover:bg-gray-800' },
  { regex: /\bhover:text-gray-900\b/g, replace: 'hover:text-gray-100' },
  { regex: /\bhover:text-gray-700\b/g, replace: 'hover:text-gray-300' },
  { regex: /\bhover:text-blue-600\b/g, replace: 'hover:text-blue-400' },
  
  // Specific blocks that need manual care
  { regex: /\bbg-[#1e1e1e]\b/g, replace: 'bg-[#111111]' }, // Console BG
  { regex: /\bbg-[#2d2d2d]\b/g, replace: 'bg-gray-900' },
  
  // Selected state
  { regex: /\bbg-indigo-50\b/g, replace: 'bg-indigo-900/40' },
  { regex: /\btext-indigo-700\b/g, replace: 'text-indigo-300' },
  { regex: /\btext-indigo-900\b/g, replace: 'text-indigo-100' },
  { regex: /\btext-indigo-600\b/g, replace: 'text-indigo-400' },

  // Button Emerald
  { regex: /\bbg-emerald-50\b/g, replace: 'bg-emerald-900/40' },
  { regex: /\bbg-emerald-100\b/g, replace: 'bg-emerald-900/60' },
  { regex: /\btext-emerald-700\b/g, replace: 'text-emerald-400' },
  { regex: /\bhover:bg-emerald-100\b/g, replace: 'hover:bg-emerald-800/60' },
];

replacements.forEach(({ regex, replace }) => {
  content = content.replace(regex, replace);
});

// Since we replaced bg-gray-900 to text-gray-100 maybe? Wait no, let's fix any bg-gray-900 that should remain
fs.writeFileSync('src/App.tsx', content);

console.log("Replaced colors successfully");
