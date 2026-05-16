"""Unit tests for forge.rotation — pure logic, no network."""

from __future__ import annotations

from forge.rotation import ORDER, CloudProvider, next_provider


def test_next_provider_cycles_order():
    assert next_provider(0) == CloudProvider.ORACLE
    assert next_provider(1) == CloudProvider.AWS
    assert next_provider(2) == CloudProvider.AZURE
    assert next_provider(3) == CloudProvider.ORACLE
    assert next_provider(9) == CloudProvider.ORACLE
    assert next_provider(10) == CloudProvider.AWS


def test_order_covers_all_enum_values():
    assert len(ORDER) == len(CloudProvider)
    assert set(ORDER) == set(CloudProvider)


def test_cloud_provider_is_str_subclass():
    assert CloudProvider.AWS == "aws"
    assert isinstance(CloudProvider.AWS, str)
