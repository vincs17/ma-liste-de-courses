class ShoppingList {
    constructor() {
        this.items = [];
        this.githubToken = 'À_MODIFIER_APRÈS'; // NE PAS MODIFIER MAINTENANT
        this.repoOwner = 'À_MODIFIER_APRÈS';   // NE PAS MODIFIER MAINTENANT
        this.repoName = 'ma-liste-de-courses';
        this.dataFile = 'shopping-data.json';
        this.init();
    }

    async init() {
        await this.loadItems();
        this.renderItems();
        this.setupEventListeners();
        this.startSync();
    }

    async loadItems() {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.dataFile}`,
                {
                    headers: {
                        'Authorization': `token ${this.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const content = atob(data.content);
                this.items = JSON.parse(content);
                this.removeDuplicates();
            }
        } catch (error) {
            console.log('Chargement des données initial...');
        }
    }

    async saveItems() {
        const content = btoa(JSON.stringify(this.items, null, 2));
        
        try {
            let sha = null;
            try {
                const existingFile = await fetch(
                    `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.dataFile}`,
                    {
                        headers: {
                            'Authorization': `token ${this.githubToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                
                if (existingFile.ok) {
                    const data = await existingFile.json();
                    sha = data.sha;
                }
            } catch (e) {}

            const response = await fetch(
                `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.dataFile}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: 'Mise à jour de la liste',
                        content: content,
                        sha: sha
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Erreur sauvegarde GitHub');
            }
        } catch (error) {
            console.error('Erreur:', error);
            localStorage.setItem('shoppingList', JSON.stringify(this.items));
        }
    }

    addItem(name) {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        const newItem = {
            id: Date.now().toString(),
            name: trimmedName,
            timestamp: new Date().toISOString()
        };

        this.items.push(newItem);
        this.removeDuplicates();
        this.saveItems();
        this.renderItems();
    }

    deleteItem(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.saveItems();
        this.renderItems();
    }

    removeDuplicates() {
        const seen = new Set();
        this.items = this.items.filter(item => {
            const lowerName = item.name.toLowerCase();
            if (seen.has(lowerName)) {
                return false;
            }
            seen.add(lowerName);
            return true;
        });
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

    startSync() {
        setInterval(async () => {
            await this.loadItems();
            this.renderItems();
        }, 30000);
    }
}

const shoppingList = new ShoppingList();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker enregistré'))
        .catch(err => console.log('Erreur Service Worker:', err));
}

function addItem() {
    const input = document.getElementById('newItem');
    shoppingList.addItem(input.value);
    input.value = '';
}
