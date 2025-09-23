# Simple test for GET /api/tasks
try {
    # Login
    $loginBody = @{
        email = "test@example.com"
        password = "password123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    
    if ($loginResponse.success) {
        Write-Host "Login successful"
        $token = $loginResponse.data.token
        
        # Test GET /api/tasks
        $headers = @{
            "Authorization" = "Bearer $token"
        }
        
        $tasksResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/tasks?project_id=2618ddd2-9d41-4041-94e8-93ed27c6ef85" -Method GET -Headers $headers
        
        Write-Host "GET /api/tasks SUCCESS!"
        Write-Host "Tasks count: $($tasksResponse.data.tasks.Count)"
        
    } else {
        Write-Host "Login failed: $($loginResponse.error)"
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
}