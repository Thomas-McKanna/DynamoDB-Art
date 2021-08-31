import boto3
import json

from boto3.dynamodb.types import TypeDeserializer


def lambda_handler(event, context):
    dynamodb = boto3.client("dynamodb")
    
    try:
        response = dynamodb.scan(
            TableName="drawings_metadata"
        )
    except Exception as e:
        return {
            "statusCode": 500,
            "body": str(e)
        }
        
    items = response["Items"]
    
    deserializer = TypeDeserializer()
    return {
        "statusCode": 200,
        "body": json.dumps([
            {
                k: deserializer.deserialize(v)
                for k, v in item.items()
            } 
            for item in items
        ])
    }
