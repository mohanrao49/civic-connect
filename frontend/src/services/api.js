const API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';
const ML_BASE_URL = process.env.REACT_APP_ML_BASE || 'http://localhost:8001';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('civicconnect_token');
    console.log('API Service - Token from localStorage:', token ? 'Present' : 'Missing');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
    console.log('API Service - Headers:', headers);
    return headers;
  }

  // Helper method to handle API responses
  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      console.error('API Error Response:', error);
      throw new Error(error.message || 'Something went wrong');
    }
    return response.json();
  }

  // Authentication APIs
  async sendOtpByAadhaar(aadhaarNumber) {
    const response = await fetch(`${this.baseURL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aadhaarNumber })
    });
    return this.handleResponse(response);
  }

  async verifyOtpByAadhaar(aadhaarNumber, otp) {
    const response = await fetch(`${this.baseURL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aadhaarNumber, otp })
    });
    return this.handleResponse(response);
  }

  async verifyOtp(mobile, otp) {
    const response = await fetch(`${this.baseURL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp })
    });
    return this.handleResponse(response);
  }

  async guestLogin(name) {
    const response = await fetch(`${this.baseURL}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return this.handleResponse(response);
  }

  // Registration
  async registerUser({ name, aadhaarNumber, mobile, address }) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, aadhaarNumber, mobile, address })
    });
    return this.handleResponse(response);
  }

  async adminLogin(username, password) {
    const response = await fetch(`${this.baseURL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return this.handleResponse(response);
  }

  async employeeLogin({ employeeId, password, department }) {
    const response = await fetch(`${this.baseURL}/auth/employee-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, password, department })
    });
    return this.handleResponse(response);
  }

  // Issue APIs
  async getIssues(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/issues${queryString ? `?${queryString}` : ''}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async getIssueById(id) {
    const response = await fetch(`${this.baseURL}/issues/${id}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async createIssue(issueData) {
    const response = await fetch(`${this.baseURL}/issues`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(issueData)
    });
    return this.handleResponse(response);
  }

  async updateIssue(id, updateData) {
    const response = await fetch(`${this.baseURL}/issues/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    return this.handleResponse(response);
  }

  async deleteIssue(id) {
    const response = await fetch(`${this.baseURL}/issues/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async getUserIssues(userId) {
    const response = await fetch(`${this.baseURL}/issues/user/${userId}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async upvoteIssue(id) {
    const response = await fetch(`${this.baseURL}/issues/${id}/upvote`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async removeUpvote(id) {
    const response = await fetch(`${this.baseURL}/issues/${id}/upvote`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // Comment APIs
  async getComments(issueId) {
    const response = await fetch(`${this.baseURL}/issues/${issueId}/comments`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async addComment(issueId, commentData) {
    const response = await fetch(`${this.baseURL}/issues/${issueId}/comments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(commentData)
    });
    return this.handleResponse(response);
  }

  // Admin APIs
  async getAdminDashboard() {
    const response = await fetch(`${this.baseURL}/admin/dashboard`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async getAdminAnalytics() {
    const response = await fetch(`${this.baseURL}/admin/analytics`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async assignIssue(issueId, assignData) {
    const response = await fetch(`${this.baseURL}/admin/issues/${issueId}/assign`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(assignData)
    });
    return this.handleResponse(response);
  }

  async updateIssueStatus(issueId, statusData) {
    const response = await fetch(`${this.baseURL}/admin/issues/${issueId}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(statusData)
    });
    return this.handleResponse(response);
  }

  // Employee APIs
  async getEmployeeIssues(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/employee/issues${queryString ? `?${queryString}` : ''}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async resolveIssue(issueId, { imageFile, latitude, longitude }) {
    const formData = new FormData();
    if (imageFile) formData.append('image', imageFile);
    if (latitude) formData.append('latitude', latitude);
    if (longitude) formData.append('longitude', longitude);

    const response = await fetch(`${this.baseURL}/employee/issues/${issueId}/resolve`, {
      method: 'PUT',
      headers: {
        ...(localStorage.getItem('civicconnect_token') && { 
          Authorization: `Bearer ${localStorage.getItem('civicconnect_token')}` 
        })
      },
      body: formData
    });
    return this.handleResponse(response);
  }

  // File Upload API
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${this.baseURL}/upload/image`, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem('civicconnect_token') && { 
          Authorization: `Bearer ${localStorage.getItem('civicconnect_token')}` 
        })
      },
      body: formData
    });
    const json = await this.handleResponse(response);
    // Normalize to a consistent shape for caller
    if (json && json.data && (json.data.url || json.data.secure_url)) {
      return { 
        success: json.success !== false,
        data: {
          url: json.data.url || json.data.secure_url,
          publicId: json.data.publicId || json.data.public_id || null
        }
      };
    }
    return json;
  }

  // ML Validation API
  async validateReportWithML(payload) {
    const response = await fetch(`${ML_BASE_URL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'ML service error' }));
      throw new Error(error.message || 'ML validation failed');
    }
    return response.json();
  }

  // Notification APIs
  async getNotifications() {
    const response = await fetch(`${this.baseURL}/notifications`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async markNotificationAsRead(notificationId) {
    const response = await fetch(`${this.baseURL}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // User profile
  async getMyProfile() {
    const response = await fetch(`${this.baseURL}/auth/profile`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }
}

export default new ApiService();
