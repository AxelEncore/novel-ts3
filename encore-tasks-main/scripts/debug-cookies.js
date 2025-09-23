// Скрипт для отладки cookies в браузере
// Запустите в консоли браузера на http://localhost:3000

console.log('=== ОТЛАДКА COOKIES ===');

// 1. Показать все cookies
console.log('\n1. Все cookies документа:');
console.log('document.cookie:', document.cookie);

// 2. Разобрать cookies
const cookies = document.cookie.split(';').reduce((acc, cookie) => {
  const [name, value] = cookie.trim().split('=');
  if (name) acc[name] = value;
  return acc;
}, {});

console.log('\n2. Разобранные cookies:', cookies);

// 3. Проверить конкретные auth cookies
console.log('\n3. Auth cookies:');
console.log('auth-token:', cookies['auth-token'] || 'НЕ НАЙДЕН');
console.log('auth-token-client:', cookies['auth-token-client'] || 'НЕ НАЙДЕН');

// 4. Проверить localStorage
console.log('\n4. localStorage:');
console.log('auth-token в localStorage:', localStorage.getItem('auth-token') || 'НЕ НАЙДЕН');

// 5. Тест API запроса
console.log('\n5. Тестирование API запроса...');
fetch('/api/auth/me', {
  method: 'GET',
  credentials: 'include'
})
.then(response => {
  console.log('Статус ответа:', response.status);
  console.log('Заголовки запроса (примерные):');
  console.log('Cookie header будет содержать:', document.cookie);
  return response.json();
})
.then(data => {
  console.log('Ответ API:', data);
})
.catch(error => {
  console.error('Ошибка API:', error);
});

// 6. Функция для повторного тестирования
window.debugCookies = () => {
  console.clear();
  console.log('=== ПОВТОРНАЯ ОТЛАДКА COOKIES ===');
  
  const currentCookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name) acc[name] = value;
    return acc;
  }, {});
  
  console.log('Текущие cookies:', currentCookies);
  console.log('auth-token:', currentCookies['auth-token'] || 'НЕ НАЙДЕН');
  console.log('auth-token-client:', currentCookies['auth-token-client'] || 'НЕ НАЙДЕН');
};

console.log('\n=== ГОТОВО ===');
console.log('Для повторной проверки выполните: debugCookies()');