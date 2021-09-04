import boto3
import simplejson as json

from boto3.dynamodb.types import TypeSerializer, TypeDeserializer


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
    serializer = TypeSerializer()
    body = json.loads(event["body"])
    
    try:
        drawing_id = body["id"]
    except KeyError:
        return get_response(400, "Request must include key for 'id'")
    
    try:
        response = dynamodb.scan(
            ExpressionAttributeValues={
                ":id": serializer.serialize(drawing_id)
            },
            FilterExpression="id = :id",
            TableName="drawings"
        )
    except Exception as e:
        return get_response(500, str(e))
        
    items = response["Items"]
    
    if not len(items):
        return get_response(404)
    else:
        deserializer = TypeDeserializer()
        body = [
            {
                k: deserializer.deserialize(v)
                for k, v in item.items() if k != "id"
            } 
            for item in items
        ]
        return get_response(200, body)
