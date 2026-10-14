import { useState } from 'react';

const INGREDIENT_EMOJI = [
  ['tomato', '🍅'], ['onion', '🧅'], ['shallot', '🧅'], ['potato', '🥔'], ['yam', '🍠'], ['tapioca', '🍠'],
  ['carrot', '🥕'], ['garlic', '🧄'], ['ginger', '🫚'], ['chilli', '🌶️'], ['capsicum', '🫑'], ['brinjal', '🍆'],
  ['cucumber', '🥒'], ['corn', '🌽'], ['peas', '🫛'], ['beans', '🫘'], ['spinach', '🥬'], ['lettuce', '🥬'],
  ['cabbage', '🥬'], ['leaves', '🌿'], ['coriander', '🌿'], ['mint', '🌿'], ['basil', '🌿'], ['cauliflower', '🥦'],
  ['broccoli', '🥦'], ['mushroom', '🍄'], ['lemon', '🍋'], ['lime', '🍋'], ['apple', '🍎'], ['banana', '🍌'],
  ['mango', '🥭'], ['papaya', '🥭'], ['orange', '🍊'], ['pineapple', '🍍'], ['grapes', '🍇'], ['watermelon', '🍉'],
  ['pomegranate', '🍎'], ['guava', '🍐'], ['strawberry', '🍓'], ['blueberry', '🫐'], ['coconut', '🥥'],
  ['avocado', '🥑'], ['egg', '🥚'], ['milk', '🥛'], ['curd', '🥛'], ['yogurt', '🥛'], ['cream', '🥛'],
  ['paneer', '🧀'], ['cheese', '🧀'], ['butter', '🧈'], ['ghee', '🧈'], ['chicken', '🍗'], ['mutton', '🥩'],
  ['fish', '🐟'], ['salmon', '🐟'], ['prawn', '🦐'], ['rice', '🍚'], ['poha', '🍚'], ['flour', '🌾'],
  ['semolina', '🌾'], ['oats', '🌾'], ['bread', '🍞'], ['pasta', '🍝'], ['noodle', '🍜'], ['vermicelli', '🍜'],
  ['dal', '🫘'], ['chickpea', '🫘'], ['kidney', '🫘'], ['gram', '🫘'], ['soya', '🫘'], ['tofu', '🫘'],
  ['almond', '🥜'], ['cashew', '🥜'], ['walnut', '🥜'], ['peanut', '🥜'], ['pistachio', '🥜'], ['seeds', '🌱'],
  ['makhana', '🥜'], ['honey', '🍯'], ['jaggery', '🍯'], ['sugar', '🍬'], ['salt', '🧂'], ['oil', '🫒'],
  ['tamarind', '🫘'], ['pepper', '🌶️'], ['masala', '🌶️'], ['powder', '🌶️'], ['water', '💧'], ['papad', '🫓'],
];

const CATEGORY_EMOJI = {
  Vegetables: '🥦', Fruits: '🍎', 'Grains & Cereals': '🌾', 'Legumes & Pulses': '🫘', 'Dairy & Alternatives': '🥛',
  'Poultry & Meat': '🍗', Seafood: '🐟', Eggs: '🥚', 'Spices & Seasonings': '🧂', Herbs: '🌿', 'Nuts & Seeds': '🥜',
  'Oils & Fats': '🫒', 'Condiments & Sauces': '🍯', Bakery: '🍞', Others: '🍴',
};

export const ingredientEmoji = (name = '', category = '') => {
  const lower = String(name).toLowerCase();
  const hit = INGREDIENT_EMOJI.find(([key]) => lower.includes(key));
  return hit ? hit[1] : CATEGORY_EMOJI[category] || '🍴';
};

export const IngredientIcon = ({ name, category, size = 'md' }) => {
  const sizes = { sm: 'h-8 w-8 text-lg rounded-lg', md: 'h-11 w-11 text-2xl rounded-xl', lg: 'h-14 w-14 text-3xl rounded-2xl' };
  return (
    <span className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-surface-2 to-surface-3 ring-1 ring-inset ring-line ${sizes[size]}`} aria-hidden="true">
      {ingredientEmoji(name, category)}
    </span>
  );
};

const DISH_EMOJI = [
  ['biryani', '🍛'], ['curry', '🍛'], ['masala', '🍛'], ['dal', '🍲'], ['sambar', '🍲'], ['rasam', '🍲'], ['khichdi', '🍲'],
  ['upma', '🍲'], ['poha', '🍲'], ['soup', '🍲'], ['stew', '🍲'], ['kadhi', '🍲'], ['erissery', '🍲'], ['thoran', '🥗'],
  ['salad', '🥗'], ['chaat', '🥗'], ['bowl', '🥣'], ['oatmeal', '🥣'], ['porridge', '🥣'], ['rice', '🍚'],
  ['pulao', '🍚'], ['idli', '🍚'], ['dosa', '🥞'], ['uttapam', '🥞'], ['chilla', '🥞'], ['pancake', '🥞'],
  ['appam', '🥞'], ['puttu', '🍚'], ['paratha', '🫓'], ['chapati', '🫓'], ['roti', '🫓'], ['thepla', '🫓'],
  ['phulka', '🫓'], ['toast', '🍞'], ['sandwich', '🥪'], ['egg', '🍳'], ['omelette', '🍳'], ['bhurji', '🍳'],
  ['shakshuka', '🍳'], ['chicken', '🍗'], ['tikka', '🍢'], ['fish', '🐟'], ['prawn', '🦐'], ['mutton', '🥩'],
  ['smoothie', '🥤'], ['lassi', '🥤'], ['chaas', '🥤'], ['buttermilk', '🥤'], ['cooler', '🥤'], ['drink', '🥤'],
  ['noodle', '🍜'], ['pasta', '🍝'], ['payasam', '🍮'], ['pudding', '🍮'], ['balls', '🍡'], ['wedges', '🍟'],
  ['pakoda', '🍤'], ['cutlet', '🥙'], ['dhokla', '🍰'], ['makhana', '🥜'], ['nuts', '🥜'], ['fruit', '🍉'],
  ['papaya', '🥭'], ['mango', '🥭'], ['guava', '🍐'], ['salsa', '🥗'],
];

const MEAL_ART = {
  Breakfast: { emoji: '🥞', from: '#ffe7c2', to: '#f6b36b', darkFrom: '#4a3414', darkTo: '#7a521c' },
  'Morning Snack': { emoji: '🍎', from: '#ffe0da', to: '#f3998a', darkFrom: '#4a2220', darkTo: '#7a3a33' },
  Lunch: { emoji: '🍛', from: '#d7f3df', to: '#86d3a2', darkFrom: '#173a24', darkTo: '#28623e' },
  'Evening Snack': { emoji: '🍿', from: '#ece2fb', to: '#b9a2ec', darkFrom: '#2e2548', darkTo: '#4b3a78' },
  Dinner: { emoji: '🍽️', from: '#dbe8fb', to: '#93b6ec', darkFrom: '#1c2c48', darkTo: '#2f4b7c' },
};

const isRealImage = (url) =>
  Boolean(url) && typeof url === 'string' && !url.includes('unsplash.com') && !url.includes('placeholder');

export const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('/uploads/')) {
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
    return `${base}${url}`;
  }
  return url;
};

export const RecipeImage = ({ recipe, className = '', emojiSize = 'text-5xl' }) => {
  const [failed, setFailed] = useState(false);
  const url = recipe?.image_url || recipe?.image;
  const name = String(recipe?.name || recipe?.food_name || '').toLowerCase();
  const art = MEAL_ART[recipe?.meal_type] || MEAL_ART.Lunch;
  const dish = DISH_EMOJI.find(([key]) => name.includes(key));
  const emoji = dish ? dish[1] : art.emoji;

  if (isRealImage(url) && !failed) {
    return (
      <img
        src={resolveImageUrl(url)}
        alt={recipe?.name || ''}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`recipe-art relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{ '--art-from': art.from, '--art-to': art.to, '--art-dark-from': art.darkFrom, '--art-dark-to': art.darkTo }}
      aria-hidden="true"
    >
      <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20" />
      <span className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/15" />
      <span className="recipe-plate relative flex aspect-square h-[72%] max-h-40 items-center justify-center rounded-full">
        <span className={`${emojiSize} drop-shadow-[0_6px_8px_rgb(0_0_0/0.18)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
          {emoji}
        </span>
      </span>
    </div>
  );
};
