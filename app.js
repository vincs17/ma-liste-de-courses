class ShoppingList {
    constructor() {
        this.items = [];
        this.supabaseUrl = 'https://VOTRE_URL_SUPABASE.supabase.co';
        this.supabaseKey = 'VOTRE_CLE_SUPABASE';
        this.init();
    }

    async init() {
        // Initialiser Supabase
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
        
        await this.loadItems();
        this.renderItems();
        this.setupEventListeners();
        this.setupRealtime();
    }

    async loadItems() {
        try {
            const { data, error } = await this.supabase
                .from('shopping_items')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            
            this.items = data || [];
            this.removeDuplicates();
        } catch (error) {
            console.error('Erreur chargement:', error);
            // Charger depuis le cache local
            const saved = localStorage.getItem('shoppingList');
            if (saved) this.items = JSON.parse(saved);
        }
    }

    async addItem(name) {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        // Vérifier si existe déjà
        const exists = this.items.some(item => 
            item.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (exists) return;

        try {
            const { data, error } = await this.supabase
                .from('shopping_items')
                .insert([{ 
                    name: trimmedName,
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;

            this.items.push(data[0]);
            this.saveToLocalStorage();
            this.renderItems();
        } catch (error) {
            console.error('Erreur ajout:', error);
            // Sauvegarde locale en fallback
            const newItem = {
                id: Date.now().toString(),
                name: trimmedName,
                created_at: new Date().toISOString()
            };
            this.items.push(newItem);
            this.saveToLocalStorage();
            this.renderItems();
        }
    }

    async deleteItem(id) {
        try {
            const { error } = await this.supabase
                .from('shopping_items')
                .delete()
                .eq('id', id);

            if (error) throw error;

            this.items = this.items.filter(item => item.id !== id);
            this.saveToLocalStorage();
            this.renderItems();
        } catch (error) {
            console.error('Erreur suppression:', error);
            // Suppression locale en fallback
            this.items = this.items.filter(item => item.id !== id);
            this.saveToLocalStorage();
            this.renderItems();
        }
    }

    setupRealtime() {
        // Écouter les changements en temps réel
        this.supabase
            .channel('shopping-list-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'shopping_items' }, 
                async () => {
                    await this.loadItems();
                    this.renderItems();
                }
            )
            .subscribe();
    }

    removeDuplicates() {
        const seen = new Set();
        this.items = this.items.filter(item => {
            const lowerName = item.name.toLowerCase();
            if (seen.has(lowerName)) {
                this.deleteItem(item.id); // Supprimer le doublon
                return false;
            }
            seen.add(lowerName);
            return true;
        });
    }

    saveToLocalStorage() {
        localStorage.setItem('shoppingList', JSON.stringify(this.items));
    }

    renderItems() {
        const container = document.getElementById('itemsList');
        container.innerHTML = '';

        this.items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item';
            div.textContent = item.name;
            div.setAttribute('data-id', item.id);

            let tapCount = 0;
            div.addEventListener('click', () => {
                tapCount++;
                setTimeout(() => {
                    if (tapCount === 2) {
                        div.classList.add('double-tap');
                        setTimeout(() => {
                            this.deleteItem(item.id);
                        }, 300);
                    }
                    tapCount = 0;
                }, 300);
            });

            container.appendChild(div);
        });
    }

    setupEventListeners() {
        const input = document.getElementById('newItem');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addItem(input.value);
                input.value = '';
            }
        });

        document.querySelector('button').addEventListener('click', () => {
            this.addItem(input.value);
            input.value = '';
        });
    }
}

// Initialisation
const shoppingList = new ShoppingList();

function addItem() {
    const input = document.getElementById('newItem');
    shoppingList.addItem(input.value);
    input.value = '';
}
