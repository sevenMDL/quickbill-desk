import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { handleError, processError, getEnvironment, ErrorCategories, isRetryableError } from '@/lib/errorMessages';
import { invoiceApi, clientApi, settingsApi } from '@/lib/api';

// Environment override utility
let environmentOverride: 'development' | 'production' | null = null;

export const setEnvironmentOverride = (env: 'development' | 'production' | null) => {
  environmentOverride = env;
};

export const getCurrentEnvironment = (): 'development' | 'production' => {
  return environmentOverride || getEnvironment();
};

/**
 * Enhanced Error Testing Component with Environment Control
 */
export default function ErrorTesting() {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentEnv, setCurrentEnv] = useState<'development' | 'production'>(getCurrentEnvironment());
  const [testResults, setTestResults] = useState<Array<{
    name: string;
    success: boolean;
    userMessage: string;
    category: string;
    shouldRetry: boolean;
  }>>([]);

  // Update current env when override changes
  useEffect(() => {
    setCurrentEnv(getCurrentEnvironment());
  }, [environmentOverride]);

  const testErrorScenario = async (testName: string, testFunction: () => Promise<any>) => {
    setLoading(testName);
    
    try {
      await testFunction();
      // If no error was thrown, record as unexpected success
      const result = {
        name: testName,
        success: false,
        userMessage: 'Unexpected success - no error thrown',
        category: 'unexpected',
        shouldRetry: false
      };
      setTestResults(prev => [...prev, result]);
      toast.success(`✅ ${testName} - Success (unexpected)`);
    } catch (error) {
      const processedError = processError(error);
      const userMessage = handleError(error, `Test-${testName}`);
      
      const result = {
        name: testName,
        success: true, // true means error was properly handled
        userMessage: processedError.userMessage,
        category: processedError.category,
        shouldRetry: processedError.shouldRetry
      };
      
      setTestResults(prev => [...prev, result]);
      toast.error(`🧪 ${testName}: ${userMessage}`);
    } finally {
      setLoading(null);
    }
  };

  const errorTests = [
    {
      name: "Network Error",
      description: "Simulate network failure",
      category: ErrorCategories.NETWORK,
      function: async () => {
        await fetch('http://invalid-url-that-will-fail-test.com/api');
      }
    },
    {
      name: "Authentication Error", 
      description: "Test expired token handling",
      category: ErrorCategories.AUTH,
      function: async () => {
        localStorage.removeItem('auth_token');
        await invoiceApi.getAll();
      }
    },
    {
      name: "Not Found Error",
      description: "Access non-existent resource", 
      category: ErrorCategories.BUSINESS,
      function: async () => {
        await invoiceApi.getById('non-existent-invoice-id-12345');
      }
    },
    {
      name: "Validation Error",
      description: "Submit invalid data",
      category: ErrorCategories.VALIDATION, 
      function: async () => {
        await clientApi.create({
          name: "", // Required field empty
          email: "invalid-email", // Invalid format
          address: ""
        });
      }
    },
    {
      name: "Server Error",
      description: "Trigger 500 error",
      category: ErrorCategories.SYSTEM,
      function: async () => {
        await fetch('/api/invalid-endpoint-that-causes-server-error');
      }
    },
    {
      name: "Timeout Error",
      description: "Simulate request timeout",
      category: ErrorCategories.NETWORK,
      function: async () => {
        // Create a promise that never resolves to simulate timeout
        await new Promise(() => {});
      }
    },
    {
      name: "File Upload Error",
      description: "Test file operation failures",
      category: ErrorCategories.SYSTEM,
      function: async () => {
        // Simulate file upload failure
        const hugeFile = new File(['x'.repeat(10000000)], 'huge-file.jpg');
        if (hugeFile.size > 5000000) {
          throw new Error('File size exceeds 5MB limit');
        }
      }
    },
    {
      name: "Database Connection Error",
      description: "Simulate database issues",
      category: ErrorCategories.SYSTEM,
      function: async () => {
        throw new Error('Database connection refused');
      }
    },
    {
      name: "Rate Limit Error",
      description: "Test API rate limiting",
      category: ErrorCategories.NETWORK,
      function: async () => {
        throw new Error('429 Too Many Requests');
      }
    },
    {
      name: "Payment Processing Error",
      description: "Test payment gateway failures",
      category: ErrorCategories.BUSINESS,
      function: async () => {
        throw new Error('Payment processing failed: Insufficient funds');
      }
    }
  ];

  const runAllTests = async () => {
    setTestResults([]);
    for (const test of errorTests) {
      await testErrorScenario(test.name, test.function);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testErrorCategorization = () => {
    const testCases = [
      { message: 'Network request failed', expected: ErrorCategories.NETWORK },
      { message: '401 Unauthorized', expected: ErrorCategories.AUTH },
      { message: '404 Not Found', expected: ErrorCategories.BUSINESS },
      { message: 'Validation failed', expected: ErrorCategories.VALIDATION },
      { message: '500 Internal Server Error', expected: ErrorCategories.SYSTEM },
      { message: 'timeout', expected: ErrorCategories.NETWORK },
      { message: 'ECONNREFUSED', expected: ErrorCategories.SYSTEM },
    ];

    testCases.forEach((testCase, index) => {
      setTimeout(() => {
        const error = new Error(testCase.message);
        const processed = processError(error);
        
        const isCorrect = processed.category === testCase.expected;
        const emoji = isCorrect ? '✅' : '❌';
        
        console.log(`${emoji} Categorization Test ${index + 1}:`, {
          input: testCase.message,
          expected: testCase.expected,
          actual: processed.category,
          correct: isCorrect
        });

        toast[isCorrect ? 'success' : 'error'](
          `${emoji} ${testCase.message} → ${processed.category} ${isCorrect ? '' : `(expected: ${testCase.expected})`}`
        );
      }, index * 800);
    });
  };

  const testRetryLogic = () => {
    const testCases = [
      { error: new Error('Network request failed'), shouldRetry: true },
      { error: new Error('timeout'), shouldRetry: true },
      { error: new Error('429 Too Many Requests'), shouldRetry: true },
      { error: new Error('401 Unauthorized'), shouldRetry: false },
      { error: new Error('404 Not Found'), shouldRetry: false },
      { error: new Error('Validation failed'), shouldRetry: false },
    ];

    testCases.forEach((testCase, index) => {
      setTimeout(() => {
        const shouldRetry = isRetryableError(testCase.error);
        const isCorrect = shouldRetry === testCase.shouldRetry;
        const emoji = isCorrect ? '✅' : '❌';

        toast[isCorrect ? 'success' : 'error'](
          `${emoji} Retry: ${testCase.error.message} → ${shouldRetry} ${isCorrect ? '' : `(expected: ${testCase.shouldRetry})`}`
        );
      }, index * 800);
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">🧪 Advanced Error Handling Tests</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive testing for your error handling system
        </p>
      </div>

      {/* Environment Control */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🎛️ Environment Control</span>
            <Badge variant={currentEnv === 'production' ? 'default' : 'secondary'}>
              {currentEnv.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="env-override">Force Environment Mode</Label>
              <p className="text-sm text-muted-foreground">
                Override to test production messages without rebuilding
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Development</span>
              <Switch
                id="env-override"
                checked={currentEnv === 'production'}
                onCheckedChange={(checked) => {
                  const newEnv = checked ? 'production' : 'development';
                  setEnvironmentOverride(newEnv);
                  setCurrentEnv(newEnv);
                  toast.info(`Environment set to: ${newEnv}`);
                }}
              />
              <span className="text-sm">Production</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-blue-100 rounded">
              <div className="font-semibold">Actual</div>
              <Badge variant="outline">{getEnvironment()}</Badge>
            </div>
            <div className="text-center p-2 bg-green-100 rounded">
              <div className="font-semibold">Current</div>
              <Badge variant={currentEnv === 'production' ? 'default' : 'secondary'}>
                {currentEnv}
              </Badge>
            </div>
            <div className="text-center p-2 bg-orange-100 rounded">
              <div className="font-semibold">Override</div>
              <Badge variant="outline">
                {environmentOverride ? 'Active' : 'None'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button 
          onClick={runAllTests}
          disabled={loading !== null}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? '🧪 Running Tests...' : '🚀 Run All Tests'}
        </Button>
        
        <Button 
          onClick={testErrorCategorization}
          variant="outline"
        >
          📊 Test Error Categorization
        </Button>
        
        <Button 
          onClick={testRetryLogic}
          variant="outline"
        >
          🔄 Test Retry Logic
        </Button>
      </div>

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📈 Test Results</span>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Clear Results
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium">{result.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="outline">{result.category}</Badge>
                    <Badge variant={result.shouldRetry ? 'default' : 'secondary'}>
                      {result.shouldRetry ? '🔄 Retry' : '❌ No Retry'}
                    </Badge>
                    <span className="text-muted-foreground max-w-md truncate">
                      {result.userMessage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Test Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {errorTests.map((test) => (
          <Card key={test.name} className="relative">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{test.name}</span>
                <Badge variant="outline">
                  {loading === test.name ? "Testing..." : test.category}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {test.description}
              </p>
              <Button
                onClick={() => testErrorScenario(test.name, test.function)}
                disabled={loading !== null}
                variant="outline"
                className="w-full"
              >
                {loading === test.name ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Testing...
                  </>
                ) : (
                  `Test ${test.name}`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Information */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle>🎯 What You're Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">In Development Mode:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Detailed technical error messages</li>
                <li>• Stack traces and error codes</li>
                <li>• Raw error information for debugging</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">In Production Mode:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• User-friendly, non-technical messages</li>
                <li>• No sensitive information exposed</li>
                <li>• Consistent branding and tone</li>
                <li>• Appropriate retry suggestions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
