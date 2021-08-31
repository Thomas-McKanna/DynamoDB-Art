import boto3
import simplejson as json

from boto3.dynamodb.types import TypeSerializer, TypeDeserializer


def get_response(status, body=None):
    response = {
        "statusCode": status
    }
    
    if body:
        response["body"] = json.dumps(body)
    
    return response


def lambda_handler(event, context):
    dynamodb = boto3.client("dynamodb")
    serializer = TypeSerializer()
    
    try:
        drawing_id = event["id"]
        name = event["name"]
        strokes = event["strokes"]
    except KeyError:
        return get_response(
            status=400,
            body="Request must contain keys for 'id', 'name', and 'strokes'"
        )
    
    try:
        drawings_metadata_item = {
            "id": serializer.serialize(drawing_id),
            "name": serializer.serialize(name)
        }

        response = dynamodb.put_item(
            TableName="drawings_metadata",
            Item=drawings_metadata_item
        )
        
        for stroke in strokes:
            stroke["id"] = drawing_id

        response = dynamodb.batch_write_item(
            RequestItems={
                "drawings": [
                    {
                        "PutRequest": {
                            "Item": {
                                k: serializer.serialize(v)
                                for k, v in stroke.items()
                            }
                        }
                    } 
                    for stroke in strokes
                ]
            }
        )
    except Exception as e:
        return get_response(status=500, body=str(e))

    return get_response(status=204)
