# DynamoDB Art

This is a simple AWS serverless application that allows you to draw in your web browser and replay your drawings later.

<img src='https://github.com/Thomas-McKanna/DynamoDB-Art/raw/main/dynamodb_art.gif' title='Video Walkthrough' width='600' alt='Video Walkthrough' />

## Technologies Used

- DynamoDB to store drawing metadata and individual drawings strokes, colors, and line widths for playback
- Lambda functions to create, read, and delete drawings
- API Gateway to server the Lambda functions
- SAM (Serverless Application Model) is deploy serverless infrastructure written as code
- HTML and JavaScript for the frontend (using Bootstrap library)

## How to Deploy

First, ensure you have the AWS CLI, the SAM CLI, and Python 3.x installed.

### Linux and MacOS

To deploy the stack, run

```
./start.sh
```

To delete the stack, run

```
./stop.sh
```

### Windows

First create an S3 bucket in AWS that will store your SAM information. You can name this bucket anything.

Then build the SAM project and deploy it with

```
sam build
sam deploy --guided
```

The SAM CLI will guide you through the deployment process, asking you some questions along the way.

When the deployment finishes, there will be an output with the key `ApiBase`. Take note of this value.

Once the deployment is complete, update the frontend code to point to the correct API base URL by running

```
python replace_api_base.py <API BASE URL>
```

Finally, serve the frontend locally with

```
cd frontend
python -m http.server 8000 --bind localhost
```

## Notes to Self

This section contains lessons I learned during this project that I keep for my personal review.

### Serialization and Deserialization

When sending data to DynamoDB, you need often need to serialize and deserialize your item values. There is a utility class available to help with this.

```python
from boto3.dynamodb.types import TypeSerializer, TypeDeserializer
```

### Client vs. Resource

boto3 allows you to retrieve DynamoDB as a `resource` or as a `client`, as in

```python
dynamodb = boto3.resource("dynamodb")
```

or 

```python
dynamodb = boto3.client("dynamodb")
```

The resource version has limited methods, but these methods are more convenient. For instance, if you use `batch_write_item` with the dynamodb resource, you do not need to serialize your item values. See https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html#service-resource.

The client version has many more methods, but does required serialization for item values. See https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html#client.

### API Gateway Request Transformations

When API Gateway receive a request, before forwarding that request to a lambda function, it transforms the data. Of note, it takes whatever request body comes in and stores it within the `body` key of the dictionary sent to lambda. So, in lambda you access this body with

```python
body = json.loads(event["body"])
```

Also note that the body is stringified before being sent to your lambda function, so you must deserialize it with `loads`.

### The `json` package cannot serialize type `Decimal`

Numbers in DynamoDB are converted to type `Decimal` in python, but the `json` python package cannot serialize this type of value. You can either cast to `int` in your python code, or you can use `simplejson` as a replacement to json, as in

```python
import simplejson as json
```

### CORS difficulties when making trigger from lambda web console

When making an API Gateway trigger from the lambda web console, the form does not allow you to customize much. As a result, the method created in the API gateway has `ANY` for action. This makes it difficult to enable CORS (which allows your API endpoint to be called from anywhere or a subset of specified domains).

If not using SAM, I have found it best to use the aws CLI to configure the API Gateway resources. You can use the following template to create an API Gateway resource method that triggers a lambda function:

```bash
export API=<API_ID>
export PARENT_ID=<PARENT_PATH_ID> # resource ID for root path of API
export REGION=<AWS_REGION>
export ACCOUNT=<AWS_ACCOUNT_ID>

aws apigateway create-resource \
  --rest-api-id $API \
  --path-part <ENDPOINT_NAME> \ # ex. 'getItem' to create /getItem
  --parent-id $PARENT_ID

export RESOURCE=<RESOURCE_CREATED_IN_LAST_COMMAND>

aws apigateway put-method \
  --rest-api-id $API \
  --resource-id $RESOURCE \
  --http-method POST \ # change to whatever method is needed
  --authorization-type NONE

aws apigateway put-integration \
  --rest-api-id $API \
  --resource-id $RESOURCE \
  --http-method POST \
  --type AWS \
  --integration-http-method POST \
  --uri arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT}:function:<LAMBDA_FUNC_NAME>/invocations

aws apigateway put-method-response \
  --rest-api-id $API \
  --resource-id $RESOURCE \
  --http-method POST \
  --status-code 200 \
  --response-models application/json=Empty

aws apigateway put-integration-response \
  --rest-api-id $API \
  --resource-id $RESOURCE --http-method POST \
  --status-code 200 --response-templates application/json=""

# this step is optional - you can use default deployment if you want
# this command makes a deployment called 'prod'
aws apigateway create-deployment \
  --rest-api-id $API \
  --stage-name prod

# this command lets you use test feature in API Gateway web console
aws lambda add-permission \
  --function-name putDrawing \
  --statement-id <SOME_UNIQUE_ID> \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT}:${API}/*/POST/<LAMBDA_FUNC_NAME>"

# this command lets you use test feature in API Gateway web console
aws lambda add-permission \
  --function-name putDrawing \
  --statement-id <SOME_UNIQUE_ID> \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT}:${API}/<DEPLOYMENT_NAME>/POST/<LAMBDA_FUNC_NAME>"
```

After creating each method, you can use the API Gateway web console to enable CORS by selecting the method, clicking Actions, and clicking enable CORS.

### Javascript AJAX body

Make sure to stringify your JSON body before sending it, as in

```javascript
let request = new XMLHttpRequest();
request.open("POST", `${API_BASE}/put_drawing`, true);
request.send(JSON.stringify(body));
```
