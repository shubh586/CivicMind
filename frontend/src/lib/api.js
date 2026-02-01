import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach JWT token to every request
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401 errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
};

// Complaints API
export const complaintsAPI = {
    create: (data) => api.post('/complaints', data),
    list: (params) => api.get('/complaints', { params }),
    get: (id) => api.get(`/complaints/${id}`),
    updateStatus: (id, status) => api.patch(`/complaints/${id}/status`, { status }),
    getStats: () => api.get('/complaints/stats'),
};

// Departments API
export const departmentsAPI = {
    list: () => api.get('/departments'),
    get: (id) => api.get(`/departments/${id}`),
    create: (data) => api.post('/departments', data),
    update: (id, data) => api.put(`/departments/${id}`, data),
    delete: (id) => api.delete(`/departments/${id}`),
};

// Routing Rules API
export const routingAPI = {
    list: () => api.get('/routing-rules'),
    create: (data) => api.post('/routing-rules', data),
    update: (id, data) => api.put(`/routing-rules/${id}`, data),
    delete: (id) => api.delete(`/routing-rules/${id}`),
    test: (data) => api.post('/routing-rules/test', data),
};

// Review Queue API
export const reviewAPI = {
    list: () => api.get('/review-queue'),
    getStats: () => api.get('/review-queue/stats'),
    approve: (id) => api.post(`/review-queue/${id}/approve`),
    override: (id, data) => api.post(`/review-queue/${id}/override`, data),
};

// Escalations API
export const escalationsAPI = {
    list: () => api.get('/escalations'),
    getBreached: () => api.get('/escalations/breached'),
    getApproaching: () => api.get('/escalations/approaching'),
    getStats: () => api.get('/escalations/stats'),
    trigger: (id) => api.post(`/escalations/trigger/${id}`),
};

export default api;
