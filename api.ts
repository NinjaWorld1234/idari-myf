const API_URL = 'http://localhost:4000/api';

class ApiClient {
    private getToken() {
        return localStorage.getItem('app_token');
    }

    setToken(token: string) {
        localStorage.setItem('app_token', token);
    }

    clearToken() {
        localStorage.removeItem('app_token');
    }

    hasToken() {
        return !!this.getToken();
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                window.location.hash = '#/login';
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'حدث خطأ غير متوقع');
        }

        if (response.status === 204) {
            return {} as T;
        }

        return response.json();
    }

    get<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    post<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    put<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    delete<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

export const api = new ApiClient();
