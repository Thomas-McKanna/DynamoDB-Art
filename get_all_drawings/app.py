import boto3
import json

from boto3.dynamodb.types import TypeDeserializer


def get_response(status, body=None):
    response = {
        "statusCode": status,
        "headers": {
            "access-control-allow-origin": "*"
        }
    }
    
    if body:
        response["body"] = json.dumps(body)
    
    return response

def lambda_handler(event, context):
    dynamodb = boto3.client("dynamodb")
    
    try:
        response = dynamodb.scan(
            TableName="drawings_metadata"
        )
    except Exception as e:
        return get_response(500, str(e))
        
    items = response["Items"]
    
    deserializer = TypeDeserializer()
    body = [
        {
            k: deserializer.deserialize(v)
            for k, v in item.items()
        } 
        for item in items
    ]
    return get_response(200, body)
