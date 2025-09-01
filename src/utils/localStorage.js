// Enhanced localStorage wrapper for better data persistence
class LocalStorageDB {
  constructor() {
    this.prefix = 'shipments_manager_';
    this.init();
  }

  init() {
    // Initialize with sample products if none exist
    if (!this.get('products') || this.get('products').length === 0) {
      const sampleProducts = [
        { id: '1', sku: 'PROD001', name: 'Sample Product 1' },
        { id: '2', sku: 'PROD002', name: 'Sample Product 2' },
        { id: '3', sku: 'PROD003', name: 'Sample Product 3' }
      ];
      this.set('products', sampleProducts);
      console.log('Initialized with sample products:', sampleProducts);
    }

    // Initialize shipments if none exist
    if (!this.get('shipments')) {
      this.set('shipments', []);
    }

    console.log('LocalStorageDB initialized');
    console.log('Current products:', this.get('products'));
    console.log('Current shipments:', this.get('shipments'));
  }

  set(key, value) {
    try {
      const fullKey = this.prefix + key;
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(fullKey, serializedValue);
      console.log(`Saved to localStorage [${fullKey}]:`, value);
      return true;
    } catch (error) {
      console.error(`Error saving to localStorage [${key}]:`, error);
      return false;
    }
  }

  get(key) {
    try {
      const fullKey = this.prefix + key;
      const item = localStorage.getItem(fullKey);
      if (item === null) {
        console.log(`No data found in localStorage [${fullKey}]`);
        return null;
      }
      const parsed = JSON.parse(item);
      console.log(`Loaded from localStorage [${fullKey}]:`, parsed);
      return parsed;
    } catch (error) {
      console.error(`Error reading from localStorage [${key}]:`, error);
      return null;
    }
  }

  remove(key) {
    try {
      const fullKey = this.prefix + key;
      localStorage.removeItem(fullKey);
      console.log(`Removed from localStorage [${fullKey}]`);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage [${key}]:`, error);
      return false;
    }
  }

  clear() {
    try {
      // Only clear our prefixed keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      console.log('Cleared all shipments manager data from localStorage');
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  // Get all keys with our prefix
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.replace(this.prefix, ''));
      }
    }
    return keys;
  }

  // Check if localStorage is available
  isAvailable() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
}

// Create and export a single instance
const localDB = new LocalStorageDB();

// Export both the instance and the class
export default localDB;
export { LocalStorageDB };

