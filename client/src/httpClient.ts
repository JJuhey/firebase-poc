import axios, { AxiosInstance } from 'axios'

class HttpClient {
  protected client: AxiosInstance
  constructor(baseURL: string) {
    this.client = axios.create({ baseURL })
  }

  fetch = async (method: string, url: string, options?: any) => {
    return this.client({ method, url, ...options })
  }
}

const httpClient = new HttpClient('http://localhost:3001')

export default httpClient
