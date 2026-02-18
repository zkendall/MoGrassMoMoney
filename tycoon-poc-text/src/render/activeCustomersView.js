export function renderActiveCustomersView(state, activeCustomersEl) {
  activeCustomersEl.textContent = '';
  if (!state.repeatCustomers.length) {
    const li = document.createElement('li');
    li.textContent = 'No active customers yet.';
    activeCustomersEl.appendChild(li);
    return;
  }

  const sorted = [...state.repeatCustomers].sort((a, b) => a.days_since_service - b.days_since_service);
  for (const customer of sorted) {
    const li = document.createElement('li');
    const riskTag = customer.days_since_service >= 2 ? ' [risk]' : '';
    li.textContent = `${customer.name} | pref: ${customer.pattern_preference} | last service: ${customer.days_since_service}d${riskTag}`;
    activeCustomersEl.appendChild(li);
  }
}
