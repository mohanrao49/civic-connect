const API_BASE_URL =
  process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

const ML_BASE_URL =
  process.env.REACT_APP_ML_BASE || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.mlBaseURL = ML_BASE_URL;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('civicconnect_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Helper method to handle API responses
  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Something went wrong');
    }
    return response.json();
  }

  // ================= FILE UPLOADS =================
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const headers = {};
    const token = localStorage.getItem('civicconnect_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/upload/image`, {
      method: 'POST',
      headers,
      body: formData
    });
    return this.handleResponse(response);
  }

  // ================= ML VALIDATION =================
  async validateReportWithML(payload) {
    const response = await fetch(`${this.mlBaseURL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return this.handleResponse(response);
  }

  // ================= AUTH =================
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

  // ================= ISSUES =================
  async getIssues(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${this.baseURL}/issues${queryString ? `?${queryString}` : ''}`,
      { headers: this.getAuthHeaders() }
    );
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

  // ================= EMPLOYEE =================
  async getEmployeeIssues(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${this.baseURL}/employee/issues${queryString ? `?${queryString}` : ''}`,
      { headers: this.getAuthHeaders() }
    );
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

  // ================= ADMIN =================
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

  async assignIssue(issueId, body = {}) {
    const response = await fetch(`${this.baseURL}/admin/issues/${issueId}/assign`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return this.handleResponse(response);
  }

  async updateIssueStatus(issueId, body) {
    const response = await fetch(`${this.baseURL}/admin/issues/${issueId}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return this.handleResponse(response);
  }

  // Employee Management
  async createEmployee(employeeData) {
    const response = await fetch(`${this.baseURL}/admin/employees`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(employeeData)
    });
    return this.handleResponse(response);
  }

  async getEmployees(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/admin/employees?${queryParams}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  async updateEmployee(employeeId, employeeData) {
    const response = await fetch(`${this.baseURL}/admin/employees/${employeeId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(employeeData)
    });
    return this.handleResponse(response);
  }

  async deleteEmployee(employeeId) {
    const response = await fetch(`${this.baseURL}/admin/employees/${employeeId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // ================= COMMENTS =================
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

  // ================= PROFILE =================
  async getMyProfile() {
    const response = await fetch(`${this.baseURL}/auth/profile`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }
}

export default new ApiService();
