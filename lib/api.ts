const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = {
  // Auth endpoints
  login: `${API_BASE_URL}/users/login`,
  check2FA: `${API_BASE_URL}/users/check-2fa`,
  
  // Client endpoints
  clients: `${API_BASE_URL}/clients`,
  clientCompliance: (id: string) => `${API_BASE_URL}/clients/${id}/compliance`,
  
  // Firm endpoints
  firms: `${API_BASE_URL}/firms`,
  firmDetails: (id: string) => `${API_BASE_URL}/firms/${id}/details`,
  
  // Task endpoints
  tasks: `${API_BASE_URL}/tasks`,
  taskStatus: (id: string) => `${API_BASE_URL}/tasks/${id}/status`,
  taskComments: (id: string) => `${API_BASE_URL}/tasks/${id}/comments`,
  
  // Query endpoints
  queries: `${API_BASE_URL}/queries`,
  queryStatus: (id: string) => `${API_BASE_URL}/queries/${id}/status`,
  queryResponses: (id: string) => `${API_BASE_URL}/queries/${id}/responses`,
  
  // Document endpoints
  documents: `${API_BASE_URL}/documents`,
  documentUpload: `${API_BASE_URL}/documents/upload`,
  documentRequest: `${API_BASE_URL}/documents/request`,
  documentDownload: (id: string) => `${API_BASE_URL}/documents/${id}/download`,
  
  // Team endpoints
  teamMembers: `${API_BASE_URL}/users/team-members`,
  teamMember2FA: (id: string) => `${API_BASE_URL}/users/${id}/2fa`,
  teamMemberAssignClients: (id: string) => `${API_BASE_URL}/users/${id}/assign-clients`,
  
  // Manager endpoints
  managers: `${API_BASE_URL}/managers`,
  createManager: `${API_BASE_URL}/users/create-manager`,
  
  // Dashboard endpoints
  dashboardAdmin: `${API_BASE_URL}/dashboard/admin`,
  dashboardClient: `${API_BASE_URL}/dashboard/client`,
  dashboardManager: `${API_BASE_URL}/dashboard/manager`,
  dashboardTeamMember: `${API_BASE_URL}/dashboard/team-member`,
  
  // Calendar endpoints
  calendarEvents: `${API_BASE_URL}/calendar-events`,
};

export const fetchApi = async (url: string, options: RequestInit = {}) => {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const uploadFile = async (url: string, formData: FormData) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Upload Error:', error);
    throw error;
  }
}; 